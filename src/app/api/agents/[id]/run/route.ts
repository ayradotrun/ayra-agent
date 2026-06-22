import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  rateLimitResponse,
} from "@/lib/auth-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { runAgent } from "@/lib/agent/runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const agent = await prisma.agent.findUnique({ where: { id: params.id } });
  if (!agent) return notFoundResponse("Agent not found");
  if (agent.userId !== user.id) return forbiddenResponse();

  const ip = getClientIp(request);
  const limit = rateLimit(`run:${user.id}:${ip}`, 10, 60_000);
  if (!limit.success) return rateLimitResponse();

  if (agent.status === "PAUSED") {
    return NextResponse.json({ error: "Agent is paused" }, { status: 400 });
  }

  try {
    const result = await runAgent(params.id, "manual");
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
