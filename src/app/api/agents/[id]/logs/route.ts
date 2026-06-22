import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const agent = await prisma.agent.findUnique({ where: { id: params.id } });
  if (!agent) return notFoundResponse("Agent not found");
  if (agent.userId !== user.id) return forbiddenResponse();

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const level = searchParams.get("level");
  const search = searchParams.get("search");
  const runId = searchParams.get("runId");

  const logs = await prisma.agentLog.findMany({
    where: {
      agentId: params.id,
      ...(level ? { level: level as "DEBUG" | "INFO" | "WARN" | "ERROR" } : {}),
      ...(runId ? { runId } : {}),
      ...(search
        ? { message: { contains: search, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}
