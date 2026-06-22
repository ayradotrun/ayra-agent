import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { resolveChatAgent } from "@/lib/chat";
import { z } from "zod";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const sessions = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 40,
    include: {
      agent: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, role: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(sessions);
}

const createSessionSchema = z.object({
  agentId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const agent = await resolveChatAgent(user.id, parsed.data.agentId);
  if (!agent) {
    return NextResponse.json(
      { error: "No active agent found. Create an agent in the dashboard first." },
      { status: 400 }
    );
  }

  const session = await prisma.chatSession.create({
    data: { userId: user.id, agentId: agent.id },
    include: { agent: { select: { id: true, name: true, model: true } } },
  });

  return NextResponse.json(session);
}
