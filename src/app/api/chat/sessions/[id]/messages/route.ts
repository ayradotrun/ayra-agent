import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  unauthorizedResponse,
  notFoundResponse,
  rateLimitResponse,
} from "@/lib/auth-helpers";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { runAgent } from "@/lib/agent/runtime";
import { resolveEffectiveChatModel, sessionTitleFromMessage } from "@/lib/chat";
import { handleChatInput } from "@/lib/chat/handle-input";
import type { ChatMessageMetadata } from "@/lib/chat/message-content";
import {
  createChatMessage,
  getChatSession,
  listChatMessages,
  updateChatSession,
} from "@/lib/chat/chat-store";
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

function toApiMessage(message: {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  runId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    runId: message.runId,
    metadata: message.metadata,
    createdAt: message.createdAt,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const ip = getClientIp(request);
  const limit = rateLimit(`chat:${user.id}:${ip}`, 20, 60_000);
  if (!limit.success) return rateLimitResponse();

  const session = await getChatSession(user.id, params.id);
  if (!session) return notFoundResponse("Chat not found");

  const [agent, dbUser, recentMessages] = await Promise.all([
    prisma.agent.findFirst({
      where: { id: session.agentId, userId: user.id },
      select: { id: true, status: true, name: true, model: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultModel: true },
    }),
    listChatMessages(user.id, session.id, { order: "asc", limit: 24 }),
  ]);

  if (!agent) return notFoundResponse("Chat not found");
  if (agent.status === "PAUSED") {
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
    dbUser?.defaultModel,
    agent.model
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

  const history = recentMessages.map((m) => {
    const meta = m.metadata as ChatMessageMetadata | null;
    return {
      role: m.role as "user" | "assistant",
      content: m.content,
      imageUrls: meta?.imageUrls,
    };
  });

  const userMetadata: ChatMessageMetadata | undefined =
    imageUrls.length > 0 ? { imageUrls } : undefined;

  const userMessage = await createChatMessage(user.id, session.id, {
    role: "user",
    content: content || "(image)",
    metadata: userMetadata ? (userMetadata as Record<string, unknown>) : null,
  });

  try {
    const commandText = content || (imageUrls.length > 0 ? "" : "");
    if (commandText.startsWith("/")) {
      const commandResult = await handleChatInput(user.id, session.agentId, commandText, {
        chatSessionId: session.id,
      });

      if (commandResult.handled && commandResult.content) {
        const cmdImages = commandResult.imageUrls ?? [];
        const assistantMessage = await createChatMessage(user.id, session.id, {
          role: "assistant",
          content: commandResult.content,
          metadata: cmdImages.length > 0 ? ({ imageUrls: cmdImages } as Record<string, unknown>) : null,
        });

        await updateChatSession(user.id, session.id, {
          updatedAt: new Date(),
          title: session.title ?? sessionTitleFromMessage(content),
          ...(commandResult.switchAgentId ? { agentId: commandResult.switchAgentId } : {}),
        });

        return NextResponse.json({
          userMessage: toApiMessage(userMessage),
          assistantMessage: toApiMessage(assistantMessage),
          agent: commandResult.switchAgentId
            ? { id: commandResult.switchAgentId, name: commandResult.switchAgentName }
            : undefined,
        });
      }
    }

    const result = await runAgent(session.agentId, {
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

    const assistantMessage = await createChatMessage(user.id, session.id, {
      role: "assistant",
      content: result.output || result.error || "No response.",
      runId: result.runId,
      metadata: assistantMetadata ? (assistantMetadata as Record<string, unknown>) : null,
    });

    await updateChatSession(user.id, session.id, {
      updatedAt: new Date(),
      title: session.title ?? sessionTitleFromMessage(content || "Image chat"),
    });

    return NextResponse.json({
      userMessage: toApiMessage(userMessage),
      assistantMessage: toApiMessage(assistantMessage),
      run: {
        status: result.status,
        tokenUsage: result.tokenUsage,
        toolCalls: result.toolCalls,
        durationMs: result.durationMs,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat failed";
    const assistantMessage = await createChatMessage(user.id, session.id, {
      role: "assistant",
      content: `❌ ${message}`,
    });
    return NextResponse.json(
      {
        userMessage: toApiMessage(userMessage),
        assistantMessage: toApiMessage(assistantMessage),
        error: message,
      },
      { status: 500 }
    );
  }
}
