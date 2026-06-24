import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AdminError,
  adminForbiddenResponse,
  requireAdmin,
} from "@/lib/admin";
import { AuthError, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof AdminError) return adminForbiddenResponse();
    if (error instanceof AuthError) return unauthorizedResponse();
    throw error;
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;
  const query = searchParams.get("q")?.trim() ?? "";

  const where =
    query.length > 0
      ? {
          OR: [
            { email: { contains: query, mode: "insensitive" as const } },
            { username: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : undefined;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        createdAt: true,
        telegramChatEnabled: true,
        telegramChatId: true,
        defaultModel: true,
        _count: {
          select: {
            agents: true,
            sessions: true,
          },
        },
        agents: {
          select: {
            runs: {
              orderBy: { startedAt: "desc" },
              take: 1,
              select: { startedAt: true, trigger: true, status: true },
            },
          },
        },
      },
    }),
  ]);

  const items = users.map((user) => {
    const lastRun = user.agents
      .flatMap((agent) => agent.runs)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt,
      agentsCount: user._count.agents,
      sessionsCount: user._count.sessions,
      telegramConnected: Boolean(user.telegramChatEnabled && user.telegramChatId),
      defaultModel: user.defaultModel,
      lastRunAt: lastRun?.startedAt ?? null,
      lastRunTrigger: lastRun?.trigger ?? null,
      lastRunStatus: lastRun?.status ?? null,
    };
  });

  return NextResponse.json({
    users: items,
    query,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
