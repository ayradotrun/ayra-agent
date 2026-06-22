import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent/runtime";
import {
  deliverTelegramTextReply,
  getBotTokenFromUser,
  sendTelegramChatAction,
  sendTelegramMessage,
  sendTelegramPhoto,
  type TelegramUpdate,
} from "./client";
import { handleChatInput, resolveAgentIdForTelegram } from "@/lib/chat/handle-input";
import { ensureAgentModelsMatchUser } from "@/lib/user-models";
import { claimTelegramUpdate } from "./dedup";
import { shouldShowTelegramThinking, TELEGRAM_THINKING_MESSAGE } from "./thinking";

async function sendRunImages(
  botToken: string,
  chatId: string,
  imagePaths: string[],
  caption?: string
): Promise<void> {
  for (let i = 0; i < imagePaths.length; i++) {
    const filePath = imagePaths[i];
    await sendTelegramPhoto(
      botToken,
      chatId,
      filePath,
      i === 0 ? caption : undefined
    );
  }
}

async function beginTelegramProcessing(
  botToken: string,
  chatId: string,
  text: string
): Promise<number | undefined> {
  if (!shouldShowTelegramThinking(text)) return undefined;

  const imageCmd = text.trim().toLowerCase().startsWith("/image ");
  await sendTelegramChatAction(botToken, chatId, imageCmd ? "upload_photo" : "typing");

  const status = await sendTelegramMessage(botToken, chatId, TELEGRAM_THINKING_MESSAGE);
  return status.messageId;
}

export async function handleTelegramUpdate(
  userId: string,
  update: TelegramUpdate
): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.telegramChatEnabled) return;

  const botToken = getBotTokenFromUser(user);
  if (!botToken) return;

  const chatId = String(message.chat.id);

  if (user.telegramChatId && user.telegramChatId !== chatId) {
    await sendTelegramMessage(
      botToken,
      chatId,
      "⚠️ This chat is not linked to your AYRA account. Set your Chat ID in Dashboard → Settings."
    );
    return;
  }

  if (!user.telegramChatId) {
    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: chatId },
    });
  }

  const text = message.text.trim();
  const agentId = (await resolveAgentIdForTelegram(userId)) ?? "";
  const statusMessageId = await beginTelegramProcessing(botToken, chatId, text);

  const result = await handleChatInput(userId, agentId, text, { telegram: true });

  if (result.handled) {
    if (result.imagePaths?.length) {
      if (result.content) {
        await deliverTelegramTextReply(botToken, chatId, result.content, statusMessageId);
      }
      await sendRunImages(
        botToken,
        chatId,
        result.imagePaths,
        statusMessageId ? undefined : result.content
      );
    } else if (result.content) {
      await deliverTelegramTextReply(botToken, chatId, result.content, statusMessageId);
    } else if (statusMessageId) {
      await deliverTelegramTextReply(botToken, chatId, "Done.", statusMessageId);
    }
    return;
  }

  if (!agentId) {
    await deliverTelegramTextReply(
      botToken,
      chatId,
      "No active agent. Create one in the dashboard, then try again.",
      statusMessageId
    );
    return;
  }

  await ensureAgentModelsMatchUser(userId, agentId, user.telegramDefaultAgentId);

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { name: true },
  });

  let activeStatusId = statusMessageId;
  if (!activeStatusId) {
    await sendTelegramChatAction(botToken, chatId, "typing");
    const status = await sendTelegramMessage(botToken, chatId, TELEGRAM_THINKING_MESSAGE);
    activeStatusId = status.messageId;
  }

  try {
    const runResult = await runAgent(agentId, {
      trigger: "telegram",
      userMessage: text,
      replyViaTelegram: true,
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

    await deliverTelegramTextReply(botToken, chatId, finalText, activeStatusId);

    if (runResult.imagePaths && runResult.imagePaths.length > 0) {
      await sendTelegramChatAction(botToken, chatId, "upload_photo");
      await sendRunImages(botToken, chatId, runResult.imagePaths);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Run failed";
    await deliverTelegramTextReply(botToken, chatId, `❌ Error: ${msg}`, activeStatusId);
  }
}

export async function handleTelegramUpdateBySecret(
  webhookSecret: string,
  update: TelegramUpdate
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { telegramWebhookSecret: webhookSecret },
  });
  if (!user) return;

  const botToken = getBotTokenFromUser(user);
  if (!botToken) return;

  const claimed = await claimTelegramUpdate(botToken, update.update_id);
  if (!claimed) return;

  await handleTelegramUpdate(user.id, update);
}
