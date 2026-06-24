import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AdminError,
  adminForbiddenResponse,
  requireAdmin,
} from "@/lib/admin";
import { AuthError, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminError) return adminForbiddenResponse();
    if (error instanceof AuthError) return unauthorizedResponse();
    throw error;
  }

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalUsers,
    newUsers30d,
    totalAgents,
    activeAgents,
    runsToday,
    runs7d,
    failedRunsToday,
    telegramConnectedUsers,
    activeUsers7d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.agent.count(),
    prisma.agent.count({ where: { status: "ACTIVE" } }),
    prisma.agentRun.count({ where: { startedAt: { gte: today } } }),
    prisma.agentRun.count({ where: { startedAt: { gte: sevenDaysAgo } } }),
    prisma.agentRun.count({
      where: { startedAt: { gte: today }, status: { in: ["FAILED", "TIMEOUT"] } },
    }),
    prisma.user.count({
      where: {
        telegramChatEnabled: true,
        telegramChatId: { not: null },
      },
    }),
    prisma.user.count({
      where: {
        OR: [
          { sessions: { some: { expires: { gte: sevenDaysAgo } } } },
          {
            agents: {
              some: { runs: { some: { startedAt: { gte: sevenDaysAgo } } } },
            },
          },
        ],
      },
    }),
  ]);

  const runsByTrigger = await prisma.agentRun.groupBy({
    by: ["trigger"],
    where: { startedAt: { gte: sevenDaysAgo } },
    _count: { _all: true },
  });

  return NextResponse.json({
    totalUsers,
    activeUsers7d,
    newUsers30d,
    totalAgents,
    activeAgents,
    runsToday,
    runs7d,
    failedRunsToday,
    telegramConnectedUsers,
    runsByTrigger: runsByTrigger.map((row) => ({
      trigger: row.trigger,
      count: row._count._all,
    })),
  });
}
