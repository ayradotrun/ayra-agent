import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AdminError,
  adminForbiddenResponse,
  requireAdmin,
} from "@/lib/admin";
import { AuthError, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  buildUsageAnalytics,
  parseUsageRangeDays,
  usageRangeSince,
} from "@/lib/usage/analytics";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminError) return adminForbiddenResponse();
    if (error instanceof AuthError) return unauthorizedResponse();
    throw error;
  }

  const days = parseUsageRangeDays(request.nextUrl.searchParams.get("days"));
  const since = usageRangeSince(days);

  const usageRuns = await prisma.agentRun.findMany({
    where: { startedAt: { gte: since } },
    select: {
      startedAt: true,
      tokenUsage: true,
      inputTokens: true,
      outputTokens: true,
      estimatedCostUsd: true,
      agent: { select: { model: true } },
    },
    orderBy: { startedAt: "asc" },
  });

  const analytics = buildUsageAnalytics(usageRuns, days);

  return NextResponse.json({ analytics });
}
