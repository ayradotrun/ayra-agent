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
import { resolveEffectiveChatModel, sessionTitleFromMessage } from "@/lib/chat";
import { handleChatInput } from "@/lib/chat/handle-input";
import type { ChatMessageMetadata } from "@/lib/chat/message-content";
import { z } from "zod";

const sendMessageSchema = z
  .object({
    content: z.string().max(4000).optional(),
    imageUrls: z.array(z.string().max(500)).max(4).optional(),
    deepThinking: z.boolean().optional(),
    model: z.string().max(120).optional(),
  })
  .refine((data) => (data.content?.trim()?.length ?? 0) > 0 || (data.imageUrls?.length ?? 0) > 0, {
    message: "Message or image is required",
  });

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const ip = getClientIp(request);
  const limit = rateLimit(`chat:${user.id}:${ip}`, 20, 60_000);
  if (!limit.success) return rateLimitResponse();

  const session = await prisma.chatSession.findUnique({
    where: { id: params.id },
    include: {
      agent: { select: { id: true, status: true, name: true, model: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 24 },
      user: { select: { defaultModel: true } },
    },
  });

  if (!session) return notFoundResponse("Chat not found");
  if (session.userId !== user.id) return forbiddenResponse();
  if (session.agent.status === "PAUSED") {
    return NextResponse.json({ error: "Agent is paused" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const content = parsed.data.content?.trim() ?? "";
  const imageUrls = parsed.data.imageUrls ?? [];
  const deepThinking = parsed.data.deepThinking ?? session.deepThinking;
  const effectiveModel = resolveEffectiveChatModel(
    parsed.data.model ?? session.chatModel,
    session.user.defaultModel,
    session.agent.model
  );

  if (imageUrls.length > 0) {
    const prefix = user.id.slice(0, 8);
    const invalid = imageUrls.some(
      (url) => !url.startsWith(`/api/chat/uploads/${prefix}`)
    );
    if (invalid) {
      return NextResponse.json({ error: "Invalid image attachment" }, { status: 400 });
    }
  }

  const history = session.messages.map((m) => {
    const meta = m.metadata as ChatMessageMetadata | null;
    return {
      role: m.role as "user" | "assistant",
      content: m.content,
      imageUrls: meta?.imageUrls,
    };
  });

  const userMetadata: ChatMessageMetadata | undefined =
    imageUrls.length > 0 ? { imageUrls } : undefined;

  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: content || "(image)",
      metadata: userMetadata as object | undefined,
    },
  });

  try {
    const commandText = content || (imageUrls.length > 0 ? "" : "");
    if (commandText.startsWith("/")) {
      const commandResult = await handleChatInput(user.id, session.agentId, commandText, {
        chatSessionId: session.id,
      });

      if (commandResult.handled && commandResult.content) {
        const cmdImages = commandResult.imageUrls ?? [];
        const assistantMessage = await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            role: "assistant",
            content: commandResult.content,
            metadata: cmdImages.length > 0 ? ({ imageUrls: cmdImages } as object) : undefined,
          },
        });

        await prisma.chatSession.update({
          where: { id: session.id },
          data: {
            updatedAt: new Date(),
            title: session.title ?? sessionTitleFromMessage(content),
            ...(commandResult.switchAgentId ? { agentId: commandResult.switchAgentId } : {}),
          },
        });

        return NextResponse.json({
          userMessage,
          assistantMessage,
          agent: commandResult.switchAgentId
            ? { id: commandResult.switchAgentId, name: commandResult.switchAgentName }
            : undefined,
        });
      }
    }

    const agentId = session.agentId;

    const result = await runAgent(agentId, {
      trigger: "chat",
      userMessage: content || "Describe this image and answer helpfully.",
      chatHistory: history,
      modelOverride: effectiveModel,
      deepThinking,
      userImageUrls: imageUrls,
    });

    const resultImages =
      result.imagePaths?.map((p) => {
        const name = p.split(/[/\\]/).pop();
        return name ? `/api/generated/${name}` : null;
      }).filter((u): u is string => !!u) ?? [];

    const assistantMetadata: ChatMessageMetadata | undefined =
      resultImages.length > 0 || result.reasoning
        ? {
            ...(resultImages.length > 0 ? { imageUrls: resultImages } : {}),
            ...(result.reasoning ? { reasoning: result.reasoning } : {}),
          }
        : undefined;

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: result.output || result.error || "No response.",
        runId: result.runId,
        metadata: assistantMetadata as object | undefined,
      },
    });

    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        updatedAt: new Date(),
        title: session.title ?? sessionTitleFromMessage(content || "Image chat"),
      },
    });

    return NextResponse.json({
      userMessage,
      assistantMessage,
      run: {
        status: result.status,
        tokenUsage: result.tokenUsage,
        toolCalls: result.toolCalls,
        durationMs: result.durationMs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "assistant",
        content: `❌ ${message}`,
      },
    });
    return NextResponse.json({ userMessage, assistantMessage, error: message }, { status: 500 });
  }
}
