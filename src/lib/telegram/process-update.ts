import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent/runtime";
import {
  getBotTokenFromUser,
  sendTelegramMessage,
  type TelegramUpdate,
} from "./client";
import { handleChatInput } from "@/lib/chat/handle-input";
import { getChatAgentRequirement, formatAgentRequiredReply } from "@/lib/chat";
import { ensureAgentModelsMatchUser } from "@/lib/user-models";
import { shouldShowTelegramThinking, TELEGRAM_THINKING_MESSAGE, isInstantTelegramCommand } from "./thinking";
import { findTelegramChatConflict, claimTelegramChatForUser } from "./bots-config";
import {
  getOrCreateTelegramSession,
  recordTelegramAssistantMessage,
  recordTelegramUserMessage,
  syncTelegramSessionAgent,
  telegramHistoryForAgent,
} from "./conversation";
import { withTimeoutFallback } from "@/lib/with-timeout";
import {
  photoDelivery,
  textDelivery,
  type TelegramProcessResult,
} from "./delivery-plan";

const SESSION_TIMEOUT_MS = 8_000;

async function persistTelegramTurn(
  userId: string,
  sessionId: string,
  userText: string,
  assistantText?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await withTimeoutFallback(
    (async () => {
      await recordTelegramUserMessage(userId, sessionId, userText);
      if (assistantText) {
        await recordTelegramAssistantMessage(userId, sessionId, assistantText, metadata);
      }
    })(),
    SESSION_TIMEOUT_MS,
    undefined
  );
}

export async function beginThinkingMessageId(
  botToken: string,
  chatId: string,
  text: string
): Promise<number | undefined> {
  if (!shouldShowTelegramThinking(text)) return undefined;

  const imageCmd = text.trim().toLowerCase().startsWith("/image ");
  const { sendTelegramChatAction } = await import("./client");
  await sendTelegramChatAction(botToken, chatId, imageCmd ? "upload_photo" : "typing");

  const status = await sendTelegramMessage(botToken, chatId, TELEGRAM_THINKING_MESSAGE);
  return status.messageId;
}

/**
 * Core Telegram message processing. Returns a delivery plan for the caller
 * (TypeScript client or Python gateway) to send to Telegram.
 */
export async function processTelegramUpdate(
  userId: string,
  update: TelegramUpdate,
  options?: { thinkingMessageId?: number }
): Promise<TelegramProcessResult> {
  const message = update.message;
  if (!message?.text) {
    return { ok: false, error: "No text message", deliveries: [] };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.telegramChatEnabled) {
    return { ok: false, error: "Telegram chat disabled", deliveries: [] };
  }

  const botToken = getBotTokenFromUser(user);
  if (!botToken) {
    return { ok: false, error: "No bot token", deliveries: [] };
  }

  const chatId = String(message.chat.id);

  if (user.telegramChatId && user.telegramChatId !== chatId) {
    return {
      ok: true,
      chatId,
      deliveries: [
        textDelivery(
          "⚠️ This chat is not linked to your AYRA account. Set your Chat ID in Dashboard → Settings."
        ),
      ],
    };
  }

  if (!user.telegramChatId) {
    const conflict = await findTelegramChatConflict(userId, chatId, botToken);
    if (conflict) {
      return {
        ok: true,
        chatId,
        deliveries: [
          textDelivery(
            "⚠️ This Telegram chat is already linked to another AYRA account on the same bot. " +
              "Open Dashboard → Settings → Telegram on your account and save your Chat ID again."
          ),
        ],
      };
    }
    await claimTelegramChatForUser(userId, chatId);
    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: chatId },
    });
  }

  const text = message.text.trim();
  let replaceMessageId = options?.thinkingMessageId;

  const agentRequirement = await getChatAgentRequirement(userId);
  if (!agentRequirement.ok) {
    return {
      ok: true,
      chatId,
      deliveries: [
        textDelivery(
          formatAgentRequiredReply(agentRequirement.reason, true),
          replaceMessageId
        ),
      ],
    };
  }

  const agentId = agentRequirement.agent.id;

  const deliveries: TelegramProcessResult["deliveries"] = [];
  const attachStatus = (content: string) => {
    const item = textDelivery(content, replaceMessageId);
    replaceMessageId = undefined;
    return item;
  };

  // Instant commands (/help, /status, …) must not wait on private Postgres (up to 8s).
  const telegramSession: Awaited<ReturnType<typeof getOrCreateTelegramSession>> | null =
    isInstantTelegramCommand(text)
      ? null
      : await withTimeoutFallback(
          getOrCreateTelegramSession(userId, agentId),
          SESSION_TIMEOUT_MS,
          null
        );

  try {
    const result = await handleChatInput(userId, agentId, text, { telegram: true });

    if (result.handled) {
      if (result.switchAgentId && telegramSession) {
        await syncTelegramSessionAgent(userId, telegramSession.id, result.switchAgentId);
      }

      if (result.imagePaths?.length) {
        if (result.content) {
          deliveries.push(attachStatus(result.content));
        }
        for (let i = 0; i < result.imagePaths.length; i++) {
          deliveries.push(
            photoDelivery(
              result.imagePaths[i],
              i === 0 && !result.content ? result.content : undefined
            )
          );
        }
      } else if (result.content) {
        deliveries.push(attachStatus(result.content));
      } else if (options?.thinkingMessageId != null) {
        deliveries.push(attachStatus("Done."));
      }

      if (telegramSession && result.content && !isInstantTelegramCommand(text)) {
        void persistTelegramTurn(userId, telegramSession.id, text, result.content);
      }

      return { ok: true, chatId, deliveries };
    }

    await ensureAgentModelsMatchUser(userId, agentId);

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true },
    });

    const chatHistory =
      telegramSession != null
        ? await withTimeoutFallback(
            telegramHistoryForAgent(userId, telegramSession.id),
            SESSION_TIMEOUT_MS,
            []
          )
        : [];

    const runResult = await runAgent(agentId, {
      trigger: "telegram",
      userMessage: text,
      replyViaTelegram: true,
      chatHistory,
    });

    const reply =
      runResult.output?.slice(0, 3500) ||
      runResult.summary?.slice(0, 3500) ||
      (runResult.error ? `❌ ${runResult.error}` : "Run completed with no output.");

    const isAyraFormatted =
      reply.includes("Meme scan") ||
      reply.includes("AYRA Scan") ||
      reply.includes("AYRA Quality") ||
      reply.includes("🍃");

    const finalText = isAyraFormatted
      ? reply
      : `${runResult.status === "COMPLETED" ? "✅" : runResult.status === "TIMEOUT" ? "⏱️" : "❌"} *${agent?.name ?? "Agent"}*\n\n${reply}`;

    deliveries.push(attachStatus(finalText));

    if (telegramSession) {
      void persistTelegramTurn(userId, telegramSession.id, text, finalText, {
        runId: runResult.runId,
      });
    }

    if (runResult.imagePaths && runResult.imagePaths.length > 0) {
      for (const filePath of runResult.imagePaths) {
        deliveries.push(photoDelivery(filePath));
      }
    }

    return { ok: true, chatId, deliveries };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Request failed";
    console.error("[AYRA Telegram] Process error:", error);
    return {
      ok: false,
      chatId,
      error: msg,
      deliveries: [attachStatus(`❌ ${msg.slice(0, 3500)}`)],
    };
  }
}
