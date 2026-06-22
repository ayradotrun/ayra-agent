import { z } from "zod";
import type { SkillDefinition } from "./base";
import { runLlm } from "./helpers";
import { prisma } from "@/lib/prisma";

export const taskPlanner: SkillDefinition = {
  id: "task-planner",
  name: "Task Planner",
  slug: "task-planner",
  category: "Agent Core",
  description: "Break a goal into actionable steps.",
  icon: "list-checks",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    goal: z.string().min(1).describe("Goal to plan"),
    constraints: z.string().optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Planning tasks", "task-planner");
    const plan = await runLlm(
      ctx.userId,
      "Create a step-by-step task plan as JSON array: [{ step, action, toolHint, priority }]. Output JSON only.",
      `Goal: ${input.goal}\nConstraints: ${input.constraints || "none"}`
    );
    let steps: unknown[] = [];
    try {
      steps = JSON.parse(plan.replace(/```json?\s*|\s*```/g, ""));
    } catch {
      steps = [{ step: 1, action: plan }];
    }
    return { goal: input.goal, steps, ok: true };
  },
};

export const goalTracker: SkillDefinition = {
  id: "goal-tracker",
  name: "Goal Tracker",
  slug: "goal-tracker",
  category: "Agent Core",
  description: "Store and track agent goals in memory.",
  icon: "target",
  permission: "write",
  isEnabled: true,
  inputSchema: z.object({
    goal: z.string().min(1),
    status: z.enum(["active", "completed", "paused"]).optional(),
    progress: z.string().optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Goal update: ${input.goal}`, "goal-tracker");
    const content = `[GOAL:${input.status || "active"}] ${input.goal}${input.progress ? ` — ${input.progress}` : ""}`;
    const memory = await prisma.agentMemory.create({
      data: { agentId: ctx.agentId, content, tags: ["goal", input.status || "active"] },
    });
    const goals = await prisma.agentMemory.findMany({
      where: { agentId: ctx.agentId, tags: { has: "goal" } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return { saved: memory.id, activeGoals: goals.map((g) => g.content), ok: true };
  },
};

export const scheduledTasks: SkillDefinition = {
  id: "scheduled-tasks",
  name: "Scheduled Tasks",
  slug: "scheduled-tasks",
  category: "Agent Core",
  description: "List upcoming scheduled runs for this agent.",
  icon: "clock",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    await ctx.log("INFO", "Listing scheduled tasks", "scheduled-tasks");
    const agent = await prisma.agent.findUnique({
      where: { id: ctx.agentId },
      select: { name: true, schedule: true, status: true },
    });
    const jobs = await prisma.scheduledJob.findMany({
      where: { agentId: ctx.agentId },
      orderBy: { nextRunAt: "asc" },
      take: 5,
    });
    const recentRuns = await prisma.agentRun.findMany({
      where: { agentId: ctx.agentId },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { id: true, status: true, startedAt: true, summary: true },
    });
    return {
      agent: agent?.name,
      schedule: agent?.schedule,
      status: agent?.status,
      scheduledJobs: jobs,
      recentRuns,
      ok: true,
    };
  },
};
