import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  buildUsageAnalytics,
  parseUsageRangeDays,
  usageRangeSince,
} from "@/lib/usage/analytics";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const days = parseUsageRangeDays(request.nextUrl.searchParams.get("days"));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = usageRangeSince(days);

  const [totalAgents, activeAgents, runsToday, unreadAlerts, usageRuns] = await Promise.all([
    prisma.agent.count({ where: { userId: user.id } }),
    prisma.agent.count({ where: { userId: user.id, status: "ACTIVE" } }),
    prisma.agentRun.count({
      where: {
        agent: { userId: user.id },
        startedAt: { gte: today },
      },
    }),
    prisma.alert.count({ where: { userId: user.id, read: false } }),
    prisma.agentRun.findMany({
      where: {
        agent: { userId: user.id },
        startedAt: { gte: since },
      },
      select: {
        startedAt: true,
        tokenUsage: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCostUsd: true,
        agent: { select: { model: true } },
      },
      orderBy: { startedAt: "asc" },
    }),
  ]);

  const analytics = buildUsageAnalytics(usageRuns, days);

  return NextResponse.json({
    totalAgents,
    activeAgents,
    runsToday,
    unreadAlerts,
    analytics,
  });
}
