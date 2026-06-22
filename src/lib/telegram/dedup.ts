import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashBotToken } from "@/lib/telegram/poll-offset";

/** Atomically claim a Telegram update (safe across workers + webhook). */
export async function claimTelegramUpdate(
  botToken: string,
  updateId: number
): Promise<boolean> {
  const id = `${hashBotToken(botToken)}:${updateId}`;
  try {
    await prisma.telegramProcessedUpdate.create({ data: { id } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}
