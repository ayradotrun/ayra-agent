import { prisma } from "@/lib/prisma";
import { getBotTokenFromUser } from "./client";

export interface TelegramBotConfig {
  userId: string;
  botToken: string;
  chatId: string | null;
  /** Used to disambiguate when multiple accounts share the same chat ID on one bot token */
  updatedAt: string;
  activeAgentCount: number;
  hasOwnBotToken: boolean;
}

export type TelegramUserResolveResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_linked" | "ambiguous" | "no_bot" };

/** All enabled Telegram bots — Python gateway groups by token and matches chat. */
export async function listTelegramBotConfigs(): Promise<TelegramBotConfig[]> {
  const users = await prisma.user.findMany({
    where: { telegramChatEnabled: true },
    select: {
      id: true,
      telegramBotToken: true,
      telegramChatId: true,
      updatedAt: true,
      _count: { select: { agents: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const configs: TelegramBotConfig[] = [];

  for (const user of users) {
    const botToken = getBotTokenFromUser(user);
    if (!botToken) continue;
    configs.push({
      userId: user.id,
      botToken,
      chatId: user.telegramChatId,
      updatedAt: user.updatedAt.toISOString(),
      activeAgentCount: user._count.agents,
      hasOwnBotToken: Boolean(user.telegramBotToken),
    });
  }

  return configs;
}

/** Resolve dashboard user for an incoming Telegram chat on a bot token. */
export function resolveTelegramUserForChat(
  tokenUsers: TelegramBotConfig[],
  chatId: string | null
): TelegramUserResolveResult {
  if (tokenUsers.length === 0) return { ok: false, reason: "no_bot" };

  if (chatId) {
    const exact = tokenUsers.filter((u) => u.chatId === chatId);
    if (exact.length === 1) return { ok: true, userId: exact[0].userId };
    if (exact.length > 1) {
      const withOwnToken = exact.filter((u) => u.hasOwnBotToken);
      if (withOwnToken.length === 1) {
        return { ok: true, userId: withOwnToken[0].userId };
      }
      return { ok: false, reason: "ambiguous" };
    }

    const unbound = tokenUsers.filter((u) => !u.chatId);
    if (unbound.length === 1) return { ok: true, userId: unbound[0].userId };
  }

  if (tokenUsers.length === 1) return { ok: true, userId: tokenUsers[0].userId };
  return { ok: false, reason: "not_linked" };
}

export function resolveTelegramUserForUpdate(
  configs: TelegramBotConfig[],
  botToken: string,
  chatId: string
): TelegramBotConfig | null {
  const tokenUsers = configs.filter((c) => c.botToken === botToken);
  const resolved = resolveTelegramUserForChat(tokenUsers, chatId);
  if (!resolved.ok) return null;
  return tokenUsers.find((u) => u.userId === resolved.userId) ?? null;
}

export function formatTelegramLinkReply(reason: "not_linked" | "ambiguous" | "no_bot"): string {
  if (reason === "ambiguous") {
    return (
      "⚠️ *Beberapa akun AYRA memakai chat Telegram ini*\n\n" +
      "Nonaktifkan Telegram di akun lain, atau pakai bot token berbeda per akun.\n\n" +
      "*Dashboard → Settings → Telegram*"
    );
  }
  return (
    "⚠️ *Akun Telegram belum terhubung*\n\n" +
    "Isi Chat ID di *Dashboard → Settings → Telegram*, " +
    "atau pastikan hanya satu akun AYRA memakai bot ini."
  );
}

/** True when another enabled account already owns this chat on the same bot token. */
export async function findTelegramChatConflict(
  userId: string,
  chatId: string,
  botToken: string
): Promise<boolean> {
  const others = await prisma.user.findMany({
    where: {
      id: { not: userId },
      telegramChatEnabled: true,
      telegramChatId: chatId,
    },
    select: { telegramBotToken: true },
  });

  return others.some((u) => getBotTokenFromUser(u) === botToken);
}

/** One Telegram chat may only be linked to one dashboard account per bot token. */
export async function claimTelegramChatForUser(
  userId: string,
  chatId: string
): Promise<void> {
  const chat = chatId.trim();
  if (!chat) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramBotToken: true },
  });
  if (!user) return;
  const botToken = getBotTokenFromUser(user);
  if (!botToken) return;

  const others = await prisma.user.findMany({
    where: {
      id: { not: userId },
      telegramChatEnabled: true,
      telegramChatId: chat,
    },
    select: { id: true, telegramBotToken: true },
  });

  for (const other of others) {
    if (getBotTokenFromUser(other) === botToken) {
      await prisma.user.update({
        where: { id: other.id },
        data: { telegramChatId: null },
      });
    }
  }
}

/** Remove duplicate chat_id links on the same bot token (keeps most recently updated account). */
export async function dedupeTelegramChatIds(): Promise<void> {
  const configs = await listTelegramBotConfigs();
  const byTokenChat = new Map<string, TelegramBotConfig[]>();

  for (const cfg of configs) {
    if (!cfg.chatId) continue;
    const key = `${cfg.botToken}::${cfg.chatId}`;
    const list = byTokenChat.get(key) ?? [];
    list.push(cfg);
    byTokenChat.set(key, list);
  }

  for (const dupes of Array.from(byTokenChat.values())) {
    if (dupes.length <= 1) continue;
    const keeper = [...dupes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    for (const cfg of dupes) {
      if (cfg.userId === keeper.userId) continue;
      await prisma.user.update({
        where: { id: cfg.userId },
        data: { telegramChatId: null },
      });
    }
  }
}
