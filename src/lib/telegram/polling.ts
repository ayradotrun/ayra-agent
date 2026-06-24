import { prisma } from "@/lib/prisma";
import { fetchTelegramUpdates, getBotTokenFromUser, deleteTelegramWebhook, setTelegramBotCommands } from "./client";
import { getTelegramOffset, setTelegramOffset } from "./poll-offset";
import { claimTelegramUpdate } from "./dedup";
import { resolveTelegramUserForChat } from "./bots-config";

let pollingActive = false;
let webhookCleared = false;
const commandsRegistered = new Set<string>();

export async function startTelegramPolling(): Promise<void> {
  if (pollingActive) return;
  pollingActive = true;

  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (envToken && !webhookCleared) {
    await deleteTelegramWebhook(envToken);
    webhookCleared = true;
    console.log("[AYRA Telegram] Webhook cleared for polling mode");
  }

  if (envToken && !commandsRegistered.has(envToken)) {
    await setTelegramBotCommands(envToken);
    commandsRegistered.add(envToken);
  }

  console.log("[AYRA Telegram] Polling started — bot will reply to chat messages");

  const poll = async () => {
    if (!pollingActive) return;

    try {
      const users = await prisma.user.findMany({
        where: { telegramChatEnabled: true },
        select: {
          id: true,
          telegramBotToken: true,
          telegramChatId: true,
          telegramLastUpdateId: true,
          updatedAt: true,
          _count: { select: { agents: { where: { status: "ACTIVE" } } } },
        },
      });

      const byToken = new Map<string, typeof users>();
      for (const user of users) {
        const token = getBotTokenFromUser(user);
        if (!token) continue;
        const list = byToken.get(token) ?? [];
        list.push(user);
        byToken.set(token, list);
      }

      for (const [botToken, tokenUsers] of Array.from(byToken.entries())) {
        if (!commandsRegistered.has(botToken)) {
          await setTelegramBotCommands(botToken);
          commandsRegistered.add(botToken);
        }

        const offset = (await getTelegramOffset(botToken)) + 1;
        const updates = await fetchTelegramUpdates(botToken, offset);

        for (const update of updates) {
          const chatId = update.message?.chat.id
            ? String(update.message.chat.id)
            : null;

          const tokenConfigs = tokenUsers.map((u) => ({
            userId: u.id,
            botToken,
            chatId: u.telegramChatId,
            updatedAt: u.updatedAt.toISOString(),
            activeAgentCount: u._count.agents,
            hasOwnBotToken: Boolean(u.telegramBotToken),
          }));
          const resolved = resolveTelegramUserForChat(tokenConfigs, chatId);
          const matched =
            resolved.ok ? tokenUsers.find((u) => u.id === resolved.userId) : undefined;

          if (matched) {
            const claimed = await claimTelegramUpdate(botToken, update.update_id);
            if (!claimed) continue;

            void (async () => {
              try {
                const { handleTelegramUpdate } = await import("./handler");
                await handleTelegramUpdate(matched.id, update);
              } catch (error) {
                console.error("[AYRA Telegram] Update handler failed:", error);
              }
            })();
          }
        }

        if (updates.length > 0) {
          const maxUpdateId = Math.max(...updates.map((u) => u.update_id));
          await setTelegramOffset(botToken, maxUpdateId);

          for (const u of tokenUsers) {
            if (maxUpdateId > u.telegramLastUpdateId) {
              await prisma.user.update({
                where: { id: u.id },
                data: { telegramLastUpdateId: maxUpdateId },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("[AYRA Telegram] Poll error:", error);
    }

    setTimeout(poll, 2000);
  };

  poll();
}

export function stopTelegramPolling(): void {
  pollingActive = false;
}
