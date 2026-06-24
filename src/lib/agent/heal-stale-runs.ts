import { prisma } from "@/lib/prisma";

const STALE_RUN_MS = 15 * 60 * 1000;

/** Mark orphaned RUNNING rows as FAILED so the dashboard does not stay stuck on "running". */
export async function healStaleAgentRuns(agentId: string): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_RUN_MS);
  await prisma.agentRun.updateMany({
    where: {
      agentId,
      status: "RUNNING",
      startedAt: { lt: cutoff },
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      error: "Run did not complete (stale)",
      summary: "Failed: run did not complete",
    },
  });
}

export async function healStaleRunsForUser(userId: string): Promise<void> {
  const agents = await prisma.agent.findMany({
    where: { userId },
    select: { id: true },
  });
  await Promise.all(agents.map((a) => healStaleAgentRuns(a.id)));
}
