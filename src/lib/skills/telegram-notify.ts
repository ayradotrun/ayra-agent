import { z } from "zod";
import type { SkillDefinition } from "./base";
import { prisma } from "@/lib/prisma";
import { decryptSafe } from "@/lib/encryption";

export const telegramNotify: SkillDefinition = {
  id: "telegram-notify",
  name: "Telegram Notify",
  slug: "telegram-notify",
  category: "Notification",
  description: "Send a notification message via Telegram.",
  icon: "send",
  permission: "notify",
  isEnabled: true,
  inputSchema: z.object({
    message: z.string().min(1).describe("Message to send"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Sending Telegram notification", "telegram-notify");

    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;

    if (user?.telegramBotToken) {
      botToken = decryptSafe(user.telegramBotToken);
    }
    if (user?.telegramChatId) {
      chatId = user.telegramChatId;
    }

    if (!botToken || !chatId) {
      await ctx.log("WARN", "Telegram not configured", "telegram-notify");
      return { sent: false, error: "Telegram credentials not configured" };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: input.message,
            parse_mode: "Markdown",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        await ctx.log("ERROR", `Telegram send failed: ${error}`, "telegram-notify");
        return { sent: false, error };
      }

      await ctx.log("INFO", "Telegram notification sent", "telegram-notify");
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.log("ERROR", `Telegram error: ${message}`, "telegram-notify");
      return { sent: false, error: message };
    }
  },
};
