import { prisma } from "@/lib/prisma";
import { getBotTokenFromUser } from "./client";
import { claimTelegramUpdate } from "./dedup";

/** Atomically claim a Telegram update for a user (dedupe across gateways). */
export async function claimTelegramUpdateForUser(
  userId: string,
  updateId: number
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramBotToken: true },
  });
  if (!user) return false;
  const botToken = getBotTokenFromUser(user);
  if (!botToken) return false;
  return claimTelegramUpdate(botToken, updateId);
}
