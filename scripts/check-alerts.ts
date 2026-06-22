import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      telegramChatId: true,
      telegramChatEnabled: true,
      memeAlertsEnabled: true,
    },
  });
  const alertSentCount = await prisma.memeAlertSent.count();
  const recent = await prisma.memeAlertSent.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { mint: true, symbol: true, createdAt: true },
  });
  console.log(JSON.stringify({ users, alertSentCount, recent, envChatId: !!process.env.TELEGRAM_CHAT_ID }, null, 2));
}

main()
  .finally(() => prisma.$disconnect());
