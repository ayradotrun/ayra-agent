import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { resolveChatAgent, getChatAgentRequirement } from "@/lib/chat";
import { createChatSession, getLastChatMessage, listChatSessions } from "@/lib/chat/chat-store";
import { z } from "zod";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const sessions = await listChatSessions(user.id, 40);
  const agentIds = Array.from(new Set(sessions.map((s) => s.agentId)));

  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds }, userId: user.id },
    select: { id: true, name: true },
  });
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  const enriched = await Promise.all(
    sessions.map(async (session) => {
      const last = await getLastChatMessage(user.id, session.id);
      return {
        id: session.id,
        title: session.title,
        pinned: session.pinned,
        updatedAt: session.updatedAt,
        chatModel: session.chatModel,
        deepThinking: session.deepThinking,
        agentId: session.agentId,
        agent: agentMap.get(session.agentId) ?? { id: session.agentId, name: "Agent" },
        messages: last
          ? [{ content: last.content, role: last.role, createdAt: last.createdAt }]
          : [],
      };
    })
  );

  return NextResponse.json(enriched);
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

  const requirement = await getChatAgentRequirement(user.id);
  if (!requirement.ok) {
    return NextResponse.json({ error: requirement.error }, { status: 400 });
  }

  const agent =
    parsed.data.agentId != null
      ? await resolveChatAgent(user.id, parsed.data.agentId)
      : requirement.agent;

  if (!agent) {
    return NextResponse.json(
      { error: "Selected agent is not active. Choose an active agent or resume one in Agents." },
      { status: 400 }
    );
  }

  const session = await createChatSession(user.id, agent.id);

  return NextResponse.json({
    ...session,
    agent: { id: agent.id, name: agent.name, model: agent.model },
  });
}
