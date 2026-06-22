import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent/runtime";
import {
  getBotTokenFromUser,
  sendTelegramMessage,
  sendTelegramPhoto,
  type TelegramUpdate,
} from "./client";
import { handleChatInput, resolveAgentIdForTelegram } from "@/lib/chat/handle-input";
import { ensureAgentModelsMatchUser } from "@/lib/user-models";
import { claimTelegramUpdate } from "./dedup";

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

  if (text.startsWith("/image ") && agentId) {
    await sendTelegramMessage(botToken, chatId, "🎨 Generating image…");
  }

  const result = await handleChatInput(userId, agentId, text, { telegram: true });

  if (result.handled) {
    if (result.imagePaths?.length) {
      await sendRunImages(botToken, chatId, result.imagePaths, result.content);
    } else if (result.content) {
      await sendTelegramMessage(botToken, chatId, result.content);
    }
    return;
  }

  if (!agentId) {
    await sendTelegramMessage(
      botToken,
      chatId,
      "No active agent. Create one in the dashboard, then try again."
    );
    return;
  }

  await ensureAgentModelsMatchUser(userId, agentId, user.telegramDefaultAgentId);

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { name: true },
  });

  await sendTelegramMessage(botToken, chatId, `⏳ Running *${agent?.name ?? "agent"}*…`);

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

    if (isAyraFormatted) {
      await sendTelegramMessage(botToken, chatId, reply);
    } else {
      const prefix =
        runResult.status === "COMPLETED" ? "✅" : runResult.status === "TIMEOUT" ? "⏱️" : "❌";
      await sendTelegramMessage(botToken, chatId, `${prefix} *${agent?.name ?? "Agent"}*\n\n${reply}`);
    }

    if (runResult.imagePaths && runResult.imagePaths.length > 0) {
      await sendRunImages(botToken, chatId, runResult.imagePaths);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Run failed";
    await sendTelegramMessage(botToken, chatId, `❌ Error: ${msg}`);
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
