import cron, { type ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent/runtime";
import { scheduleToCron } from "@/lib/agent/scheduler";
import type { ScheduleInterval } from "@prisma/client";

const activeJobs = new Map<string, ScheduledTask>();

export async function startScheduler() {
  console.log("[Scheduler] Starting agent scheduler...");

  try {
    const agents = await prisma.agent.findMany({
      where: { status: "ACTIVE", schedule: { not: "MANUAL" } },
    });

    for (const agent of agents) {
      registerAgentSchedule(agent.id, agent.schedule);
    }

    console.log(`[Scheduler] Registered ${activeJobs.size} scheduled agents`);
  } catch (error) {
    console.warn("[Scheduler] Could not connect to database:", error);
    console.warn("[Scheduler] Worker will retry on next poll cycle");
  }

  // Poll every minute for due jobs and new agents
  cron.schedule("* * * * *", async () => {
    try {
      await syncSchedules();
      await pollDueAgents();
    } catch (error) {
      console.error("[Scheduler] Poll error:", error);
    }
  });
}

async function syncSchedules() {
  const agents = await prisma.agent.findMany({
    where: { status: "ACTIVE", schedule: { not: "MANUAL" } },
  });

  const activeIds = new Set(agents.map((a) => a.id));

  for (const agent of agents) {
    if (!activeJobs.has(agent.id)) {
      registerAgentSchedule(agent.id, agent.schedule);
    }
  }

  for (const id of Array.from(activeJobs.keys())) {
    if (!activeIds.has(id)) {
      unregisterAgentSchedule(id);
    }
  }
}

export function registerAgentSchedule(agentId: string, schedule: ScheduleInterval) {
  unregisterAgentSchedule(agentId);

  const cronExpr = scheduleToCron(schedule);
  if (!cronExpr) return;

  const task = cron.schedule(cronExpr, async () => {
    console.log(`[Scheduler] Running scheduled agent: ${agentId}`);
    try {
      await runAgent(agentId, "scheduled");
    } catch (error) {
      console.error(`[Scheduler] Scheduled run failed for ${agentId}:`, error);
    }
  });

  activeJobs.set(agentId, task);
  console.log(`[Scheduler] Registered ${agentId} with cron: ${cronExpr}`);
}

export function unregisterAgentSchedule(agentId: string) {
  const existing = activeJobs.get(agentId);
  if (existing) {
    existing.stop();
    activeJobs.delete(agentId);
  }
}

async function pollDueAgents() {
  const now = new Date();
  const jobs = await prisma.scheduledJob.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    include: { agent: true },
  });

  for (const job of jobs) {
    if (job.agent.status !== "ACTIVE") continue;
    try {
      await runAgent(job.agentId, "scheduled");
      const nextRun = new Date(now.getTime() + 5 * 60 * 1000);
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { lastRunAt: now, nextRunAt: nextRun },
      });
    } catch (error) {
      console.error("[Scheduler] Poll run failed:", error);
    }
  }
}
