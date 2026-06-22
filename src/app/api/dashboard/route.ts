import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalAgents, activeAgents, runsToday, unreadAlerts, recentRuns, featuredSkills] =
    await Promise.all([
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
        where: { agent: { userId: user.id } },
        include: { agent: { select: { name: true, id: true } } },
        orderBy: { startedAt: "desc" },
        take: 8,
      }),
      prisma.skill.findMany({
        where: { isEnabled: true },
        take: 6,
        orderBy: { name: "asc" },
      }),
    ]);

  return NextResponse.json({
    totalAgents,
    activeAgents,
    runsToday,
    unreadAlerts,
    recentRuns,
    featuredSkills,
  });
}
