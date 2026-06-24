import { prisma } from "@/lib/prisma";
import { getBotTokenFromUser, type TelegramUpdate } from "./client";
import { claimTelegramUpdate } from "./dedup";
import { applyTelegramDeliveries } from "./apply-deliveries";
import { beginThinkingMessageId, processTelegramUpdate } from "./process-update";
import { getTelegramReadiness } from "@/lib/chat";

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
  const text = message.text.trim();

  const readiness = await getTelegramReadiness(userId);
  const thinkingMessageId = readiness.ok
    ? await beginThinkingMessageId(botToken, chatId, text)
    : undefined;

  const result = await processTelegramUpdate(userId, update, {
    thinkingMessageId,
  });
  if (!result.chatId) return;

  await applyTelegramDeliveries(botToken, result.chatId, result);
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

export async function dispatchTelegramUpdateForPython(
  userId: string,
  update: TelegramUpdate,
  thinkingMessageId?: number,
  options?: { skipClaim?: boolean }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.telegramChatEnabled) {
    return { ok: false as const, error: "Telegram chat disabled", deliveries: [] };
  }

  const botToken = getBotTokenFromUser(user);
  if (!botToken) {
    return { ok: false as const, error: "No bot token", deliveries: [] };
  }

  if (!options?.skipClaim) {
    const claimed = await claimTelegramUpdate(botToken, update.update_id);
    if (!claimed) {
      return { ok: true as const, skipped: true as const, deliveries: [] };
    }
  }

  return processTelegramUpdate(userId, update, { thinkingMessageId });
}
