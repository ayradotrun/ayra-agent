import { prisma } from "@/lib/prisma";
import {
  countBrainTasks,
  listBrainTasks,
} from "@/lib/brain/brain-store";

/** AYRA autonomous brain instructions (TS-native). */
export const AYRA_BRAIN_INSTRUCTIONS = `
AYRA Brain mode — autonomous task execution:
- Break user goals into steps with task_planner, then schedule work with brain_task_schedule.
- Persist important facts with memory_storage; recall with memory_search before repeating work.
- For X/Twitter: draft first (x_draft_generator / x_thread_drafter), schedule with type TWEET, post only when auto-post is enabled.
- For content calendars: use brain_calendar_plan to create dated tasks — do not leave plans as chat-only text.
- For reminders and follow-ups: schedule type REMINDER or CUSTOM with a concrete scheduledAt (ISO 8601 UTC).
- After completing work, store outcomes in memory and schedule next steps when appropriate.
- Never claim a tweet was posted or a task ran unless the tool confirmed it.
`.trim();

export interface BrainContextBlock {
  pendingTasks: Array<{
    id: string;
    type: string;
    title: string;
    scheduledAt: Date;
  }>;
  activeGoals: string[];
  recentCompleted: Array<{ title: string; result: string | null }>;
}

async function resolveBrainUserId(agentId: string, userId?: string): Promise<string | null> {
  if (userId) return userId;
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { userId: true },
  });
  return agent?.userId ?? null;
}

export async function loadBrainContext(
  agentId: string,
  userId?: string
): Promise<BrainContextBlock> {
  const uid = await resolveBrainUserId(agentId, userId);
  if (!uid) {
    return { pendingTasks: [], activeGoals: [], recentCompleted: [] };
  }

  const now = new Date();

  const [pendingTasks, goalMemories, recentCompleted] = await Promise.all([
    listBrainTasks(uid, {
      agentId,
      status: "PENDING",
      scheduledAfter: now,
      limit: 12,
      order: "asc",
    }),
    prisma.agentMemory.findMany({
      where: { agentId, tags: { has: "goal" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { content: true },
    }),
    listBrainTasks(uid, {
      agentId,
      status: "COMPLETED",
      limit: 3,
      order: "desc",
    }),
  ]);

  return {
    pendingTasks: pendingTasks.map((t) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      scheduledAt: t.scheduledAt,
    })),
    activeGoals: goalMemories.map((m) => m.content),
    recentCompleted: recentCompleted.map((t) => ({
      title: t.title,
      result: t.result,
    })),
  };
}

export function formatBrainContextForPrompt(ctx: BrainContextBlock): string {
  const parts: string[] = ["\n--- AYRA Brain state ---"];

  if (ctx.activeGoals.length > 0) {
    parts.push("\nActive goals:");
    for (const g of ctx.activeGoals) parts.push(`- ${g}`);
  }

  if (ctx.pendingTasks.length > 0) {
    parts.push("\nUpcoming scheduled tasks (persisted):");
    for (const t of ctx.pendingTasks) {
      parts.push(
        `- [${t.type}] ${t.title} — ${t.scheduledAt.toISOString()} (id: ${t.id.slice(0, 8)}…)`
      );
    }
  } else {
    parts.push("\nNo upcoming brain tasks scheduled.");
  }

  if (ctx.recentCompleted.length > 0) {
    parts.push("\nRecently completed brain tasks:");
    for (const t of ctx.recentCompleted) {
      parts.push(`- ${t.title}${t.result ? `: ${t.result.slice(0, 120)}` : ""}`);
    }
  }

  parts.push("--- end brain state ---");
  return parts.join("\n");
}

export async function buildBrainScheduledPrompt(agentId: string): Promise<string> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { userId: true },
  });
  const ctx = await loadBrainContext(agentId, agent?.userId);
  const dueNow = agent?.userId
    ? await countBrainTasks(agent.userId, {
        agentId,
        status: "PENDING",
        scheduledBefore: new Date(),
      })
    : 0;

  const lines = [
    "This is a scheduled AYRA Brain run.",
    "Review goals and pending tasks. Execute what is due using tools.",
    "Schedule follow-ups for anything incomplete.",
  ];

  if (dueNow > 0) {
    lines.push(`${dueNow} brain task(s) are due now — the worker may also process them.`);
  }

  lines.push(formatBrainContextForPrompt(ctx));
  return lines.join("\n");
}

export function agentHasBrainSkills(enabledSlugs: string[]): boolean {
  const brainSlugs = [
    "brain-task-schedule",
    "brain-task-list",
    "brain-calendar-plan",
    "task-planner",
    "goal-tracker",
  ];
  return brainSlugs.some((s) => enabledSlugs.includes(s));
}
