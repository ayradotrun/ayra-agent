import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
} from "@/lib/auth-helpers";
import { normalizeChatModel } from "@/lib/models";
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

  const session = await prisma.chatSession.findUnique({
    where: { id: params.id },
    include: {
      agent: { select: { id: true, name: true, model: true, status: true } },
      messages: { orderBy: { createdAt: "asc" } },
      user: { select: { defaultModel: true } },
    },
  });

  if (!session) return notFoundResponse("Chat not found");
  if (session.userId !== user.id) return forbiddenResponse();

  const { user: sessionUser, ...rest } = session;
  const effectiveModel = rest.chatModel || sessionUser.defaultModel || rest.agent.model;

  return NextResponse.json({
    ...rest,
    effectiveModel,
    defaultModel: sessionUser.defaultModel,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const session = await prisma.chatSession.findUnique({ where: { id: params.id } });
  if (!session) return notFoundResponse("Chat not found");
  if (session.userId !== user.id) return forbiddenResponse();

  const body = await request.json();
  const parsed = patchSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data: {
    chatModel?: string | null;
    deepThinking?: boolean;
    title?: string;
    pinned?: boolean;
  } = {};
  if (parsed.data.chatModel !== undefined) {
    data.chatModel = parsed.data.chatModel
      ? normalizeChatModel(parsed.data.chatModel)
      : null;
  }
  if (parsed.data.deepThinking !== undefined) {
    data.deepThinking = parsed.data.deepThinking;
  }
  if (parsed.data.title !== undefined) {
    data.title = parsed.data.title.trim();
  }
  if (parsed.data.pinned !== undefined) {
    data.pinned = parsed.data.pinned;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.chatSession.update({
      where: { id: params.id },
      data,
      include: { agent: { select: { id: true, name: true, model: true } } },
    });

    return NextResponse.json(updated);
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

  const session = await prisma.chatSession.findUnique({ where: { id: params.id } });
  if (!session) return notFoundResponse("Chat not found");
  if (session.userId !== user.id) return forbiddenResponse();

  await prisma.chatSession.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
