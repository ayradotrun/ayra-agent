import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export function hashBotToken(botToken: string): string {
  return createHash("sha256").update(botToken).digest("hex").slice(0, 32);
}

export async function getTelegramOffset(botToken: string): Promise<number> {
  const id = hashBotToken(botToken);
  const row = await prisma.telegramBotOffset.findUnique({ where: { id } });
  return row?.lastUpdateId ?? 0;
}

export async function setTelegramOffset(botToken: string, lastUpdateId: number): Promise<void> {
  const id = hashBotToken(botToken);
  await prisma.telegramBotOffset.upsert({
    where: { id },
    create: { id, lastUpdateId },
    update: { lastUpdateId },
  });
}
