import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  unauthorizedResponse,
  notFoundResponse,
} from "@/lib/auth-helpers";
import { normalizeChatModel } from "@/lib/models";
import {
  deleteChatSession,
  getChatSession,
  listChatMessages,
  updateChatSession,
} from "@/lib/chat/chat-store";
import { z } from "zod";

const patchSessionSchema = z.object({
  chatModel: z.string().nullable().optional(),
  deepThinking: z.boolean().optional(),
  title: z.string().min(1).max(120).optional(),
  pinned: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const session = await getChatSession(user.id, params.id);
  if (!session) return notFoundResponse("Chat not found");

  const [agent, dbUser, messages] = await Promise.all([
    prisma.agent.findFirst({
      where: { id: session.agentId, userId: user.id },
      select: { id: true, name: true, model: true, status: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultModel: true },
    }),
    listChatMessages(user.id, session.id, { order: "asc" }),
  ]);

  if (!agent) return notFoundResponse("Chat not found");

  const effectiveModel = session.chatModel || dbUser?.defaultModel || agent.model;

  return NextResponse.json({
    ...session,
    agent,
    messages: messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      runId: m.runId,
      metadata: m.metadata,
      createdAt: m.createdAt,
    })),
    effectiveModel,
    defaultModel: dbUser?.defaultModel,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const existing = await getChatSession(user.id, params.id);
  if (!existing) return notFoundResponse("Chat not found");

  const body = await request.json();
  const parsed = patchSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const patch: {
    chatModel?: string | null;
    deepThinking?: boolean;
    title?: string;
    pinned?: boolean;
  } = {};

  if (parsed.data.chatModel !== undefined) {
    patch.chatModel = parsed.data.chatModel
      ? normalizeChatModel(parsed.data.chatModel)
      : null;
  }
  if (parsed.data.deepThinking !== undefined) {
    patch.deepThinking = parsed.data.deepThinking;
  }
  if (parsed.data.title !== undefined) {
    patch.title = parsed.data.title.trim();
  }
  if (parsed.data.pinned !== undefined) {
    patch.pinned = parsed.data.pinned;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await updateChatSession(user.id, params.id, patch);
    if (!updated) return notFoundResponse("Chat not found");

    const agent = await prisma.agent.findFirst({
      where: { id: updated.agentId, userId: user.id },
      select: { id: true, name: true, model: true },
    });

    return NextResponse.json({ ...updated, agent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const deleted = await deleteChatSession(user.id, params.id);
  if (!deleted) return notFoundResponse("Chat not found");

  return NextResponse.json({ success: true });
}
