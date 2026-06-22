import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { scanMemeCoins, formatAyraPushAlert, type MemeTokenSnapshot } from "@/lib/agent/meme-quality";
import { getBotTokenFromUser, sendTelegramMessage } from "@/lib/telegram/client";

const INTERVAL_MINUTES = Math.max(
  2,
  parseInt(process.env.AYRA_ALERTS_INTERVAL_MINUTES || process.env.MEME_ALERTS_INTERVAL_MINUTES || "3", 10) || 3
);

function ayraAlertsEnabledGlobally(): boolean {
  const raw = process.env.AYRA_ALERTS_ENABLED ?? process.env.MEME_ALERTS_ENABLED;
  if (raw === "false" || raw === "0") return false;
  return true;
}

function resolveChatId(user: { telegramChatId: string | null }): string | null {
  return user.telegramChatId || process.env.TELEGRAM_CHAT_ID || null;
}

async function fetchPassedTokens(): Promise<MemeTokenSnapshot[]> {
  const [latest, top] = await Promise.all([
    scanMemeCoins({ limit: 12, source: "latest" }),
    scanMemeCoins({ limit: 12, source: "top" }),
  ]);

  const byMint = new Map<string, MemeTokenSnapshot>();
  for (const t of [...latest.tokens, ...top.tokens]) {
    if (t.passed) byMint.set(t.mint, t);
  }
  return Array.from(byMint.values());
}

async function runMemeAlertCycle(): Promise<void> {
  if (!ayraAlertsEnabledGlobally()) return;

  const users = await prisma.user.findMany({
    where: {
      memeAlertsEnabled: true,
      telegramChatEnabled: true,
    },
    select: {
      id: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  });

  const eligible = users.filter((u) => resolveChatId(u));
  if (eligible.length === 0) {
    console.log("[AYRA alert] No users with chat ID — set Telegram Chat ID in Settings or TELEGRAM_CHAT_ID in .env");
    return;
  }

  let passed: MemeTokenSnapshot[];
  try {
    passed = await fetchPassedTokens();
  } catch (error) {
    console.error("[AYRA alert] Scan failed:", error);
    return;
  }

  if (passed.length === 0) {
    console.log("[AYRA alert] Scan ok — 0 tokens passed filters this cycle");
    return;
  }

  let sentTotal = 0;

  for (const user of eligible) {
    const botToken = getBotTokenFromUser(user);
    const chatId = resolveChatId(user);
    if (!botToken || !chatId) continue;

    for (const token of passed) {
      const exists = await prisma.memeAlertSent.findUnique({
        where: { userId_mint: { userId: user.id, mint: token.mint } },
      });
      if (exists) continue;

      const card = formatAyraPushAlert(token);
      const sent = await sendTelegramMessage(botToken, chatId, card);
      if (!sent) {
        console.warn(`[AYRA alert] Telegram send failed for ${token.symbol ?? token.mint.slice(0, 8)}`);
        continue;
      }

      await prisma.memeAlertSent.create({
        data: {
          userId: user.id,
          mint: token.mint,
          symbol: token.symbol,
        },
      });

      sentTotal++;
      console.log(
        `[AYRA alert] Sent ${token.symbol || token.mint.slice(0, 8)} → user ${user.id.slice(0, 8)}`
      );
    }
  }

  if (sentTotal === 0) {
    console.log(`[AYRA alert] ${passed.length} token(s) passed — all already alerted (waiting for new mints)`);
  }
}

export function startMemeAlertWorker(): void {
  if (!ayraAlertsEnabledGlobally()) {
    console.log("[AYRA alert] Disabled (AYRA_ALERTS_ENABLED=false)");
    return;
  }

  console.log(`[AYRA alert] Auto push every ${INTERVAL_MINUTES} min`);

  void runMemeAlertCycle();

  cron.schedule(`*/${INTERVAL_MINUTES} * * * *`, () => {
    void runMemeAlertCycle();
  });
}
