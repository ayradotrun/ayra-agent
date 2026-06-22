import { z } from "zod";
import type { SkillDefinition } from "@/lib/skills/base";
import {
  createBrainTask,
  listBrainTasks,
  updateBrainTask,
  type BrainTaskType,
} from "@/lib/brain/brain-store";
import { runLlm } from "@/lib/skills/helpers";

const taskTypeSchema = z.enum(["TWEET", "CALENDAR", "REMINDER", "CUSTOM"]);

function parseScheduledAt(input: string): Date | null {
  const trimmed = input.trim();
  const absolute = new Date(trimmed);
  if (!Number.isNaN(absolute.getTime())) return absolute;

  const rel = trimmed.match(/^\+(\d+)(m|h|d)$/i);
  if (!rel) return null;
  const n = parseInt(rel[1], 10);
  const unit = rel[2].toLowerCase();
  const ms =
    unit === "m" ? n * 60_000 : unit === "h" ? n * 3_600_000 : n * 86_400_000;
  return new Date(Date.now() + ms);
}

export const brainTaskSchedule: SkillDefinition = {
  id: "brain-task-schedule",
  name: "Brain Task Schedule",
  slug: "brain-task-schedule",
  category: "Agent Core",
  description:
    "Schedule a persisted task (tweet, calendar item, reminder, or custom agent run) for automatic execution.",
  icon: "calendar",
  permission: "write",
  isEnabled: true,
  inputSchema: z.object({
    type: taskTypeSchema.describe("TWEET | CALENDAR | REMINDER | CUSTOM"),
    title: z.string().min(1).describe("Short task title"),
    scheduledAt: z
      .string()
      .min(1)
      .describe("ISO datetime UTC, or relative +30m, +2h, +1d"),
    text: z.string().optional().describe("Tweet text or reminder message"),
    instruction: z.string().optional().describe("Custom agent instruction for CUSTOM type"),
    platform: z.enum(["x", "telegram", "internal"]).optional(),
    draft: z.string().optional().describe("Calendar draft content"),
  }),
  async execute(input, ctx) {
    const when = parseScheduledAt(input.scheduledAt);
    if (!when) {
      return { ok: false, error: "Invalid scheduledAt. Use ISO datetime or +30m, +2h, +1d." };
    }

    const payload: Record<string, unknown> = {};
    if (input.text) payload.text = input.text;
    if (input.instruction) payload.instruction = input.instruction;
    if (input.platform) payload.platform = input.platform;
    if (input.draft) payload.draft = input.draft;

    const task = await createBrainTask({
      userId: ctx.userId,
      agentId: ctx.agentId,
      type: input.type as BrainTaskType,
      title: input.title,
      payload,
      scheduledAt: when,
    });

    await ctx.log("INFO", `Scheduled brain task ${task.id}`, "brain-task-schedule");

    return {
      ok: true,
      taskId: task.id,
      type: task.type,
      title: task.title,
      scheduledAt: task.scheduledAt.toISOString(),
      message: `Task scheduled for ${task.scheduledAt.toISOString()}`,
    };
  },
};

export const brainTaskList: SkillDefinition = {
  id: "brain-task-list",
  name: "Brain Task List",
  slug: "brain-task-list",
  category: "Agent Core",
  description: "List pending and recent brain tasks (calendar, tweets, reminders).",
  icon: "list-checks",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    status: z.enum(["pending", "completed", "all"]).optional(),
    limit: z.number().min(1).max(30).optional(),
  }),
  async execute(input, ctx) {
    const limit = input.limit ?? 15;
    const status = input.status ?? "pending";

    const tasks = await listBrainTasks(ctx.userId, {
      agentId: ctx.agentId,
      status:
        status === "all"
          ? undefined
          : status === "completed"
            ? "COMPLETED"
            : "PENDING",
      limit,
      order: status === "completed" ? "desc" : "asc",
    });

    return {
      ok: true,
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        title: t.title,
        scheduledAt: t.scheduledAt.toISOString(),
        payload: t.payload,
      })),
    };
  },
};

export const brainTaskCancel: SkillDefinition = {
  id: "brain-task-cancel",
  name: "Brain Task Cancel",
  slug: "brain-task-cancel",
  category: "Agent Core",
  description: "Cancel a pending brain task by id prefix or full id.",
  icon: "clock",
  permission: "write",
  isEnabled: true,
  inputSchema: z.object({
    taskId: z.string().min(4).describe("Task id or id prefix"),
  }),
  async execute(input, ctx) {
    const tasks = await listBrainTasks(ctx.userId, {
      agentId: ctx.agentId,
      status: "PENDING",
      order: "asc",
    });

    const match =
      tasks.find((t) => t.id === input.taskId) ||
      tasks.find((t) => t.id.startsWith(input.taskId));

    if (!match) {
      return { ok: false, error: "Pending task not found." };
    }

    await updateBrainTask(ctx.userId, match.id, { status: "CANCELLED" });

    return { ok: true, cancelledId: match.id, title: match.title };
  },
};

export const brainCalendarPlan: SkillDefinition = {
  id: "brain-calendar-plan",
  name: "Brain Calendar Plan",
  slug: "brain-calendar-plan",
  category: "Social",
  description:
    "Generate a multi-day X/content calendar and persist each slot as scheduled brain tasks.",
  icon: "calendar-days",
  permission: "write",
  isEnabled: true,
  inputSchema: z.object({
    days: z.number().min(1).max(14).optional(),
    theme: z.string().min(1).describe("Campaign or content theme"),
    postsPerDay: z.number().min(1).max(4).optional(),
    startAt: z.string().optional().describe("ISO start datetime, default tomorrow 09:00 UTC"),
  }),
  async execute(input, ctx) {
    const days = input.days ?? 7;
    const postsPerDay = input.postsPerDay ?? 1;

    await ctx.log("INFO", `Planning ${days}-day brain calendar`, "brain-calendar-plan");

    const planJson = await runLlm(
      ctx.userId,
      `Create a ${days}-day content calendar as JSON array. Each item: { "dayOffset": 0-based, "hourUtc": 0-23, "title": string, "postType": string, "draftHook": string, "platform": "x" | "telegram" }. Output valid JSON only.`,
      `Theme: ${input.theme}\nPosts per day: ${postsPerDay}`
    );

    let items: Array<{
      dayOffset?: number;
      hourUtc?: number;
      title?: string;
      postType?: string;
      draftHook?: string;
      platform?: string;
    }> = [];

    try {
      items = JSON.parse(planJson.replace(/```json?\s*|\s*```/g, ""));
    } catch {
      return { ok: false, error: "Could not parse calendar JSON from LLM." };
    }

    const startBase = input.startAt ? new Date(input.startAt) : new Date();
    if (!input.startAt) {
      startBase.setUTCDate(startBase.getUTCDate() + 1);
      startBase.setUTCHours(9, 0, 0, 0);
    }

    const created: Array<{ id: string; title: string; scheduledAt: string }> = [];

    for (const item of items.slice(0, days * postsPerDay)) {
      const dayOffset = item.dayOffset ?? 0;
      const hourUtc = item.hourUtc ?? 9;
      const scheduledAt = new Date(startBase);
      scheduledAt.setUTCDate(scheduledAt.getUTCDate() + dayOffset);
      scheduledAt.setUTCHours(hourUtc, 0, 0, 0);

      const title = item.title || `Day ${dayOffset + 1} post`;
      const platform = item.platform === "telegram" ? "telegram" : "x";
      const type = platform === "x" ? "TWEET" : "CALENDAR";

      const task = await createBrainTask({
        userId: ctx.userId,
        agentId: ctx.agentId,
        type,
        title,
        scheduledAt,
        payload: {
          draft: item.draftHook || "",
          postType: item.postType || "post",
          platform,
          theme: input.theme,
        },
      });

      created.push({
        id: task.id,
        title: task.title,
        scheduledAt: task.scheduledAt.toISOString(),
      });
    }

    return {
      ok: true,
      theme: input.theme,
      scheduled: created.length,
      tasks: created,
    };
  },
};
