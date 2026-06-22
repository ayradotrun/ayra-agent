import { prisma } from "@/lib/prisma";
import { getBotTokenFromUser, sendTelegramMessage } from "@/lib/telegram/client";

export async function notifyUserBrainEvent(
  userId: string,
  message: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.telegramChatEnabled) return false;

  const botToken = getBotTokenFromUser(user);
  const chatId = user.telegramChatId || process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return false;

  const result = await sendTelegramMessage(botToken, chatId, message);
  return result.ok;
}
