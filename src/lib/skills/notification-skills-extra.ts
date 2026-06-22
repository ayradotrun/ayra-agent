import { z } from "zod";
import type { SkillDefinition } from "./base";
import { prisma } from "@/lib/prisma";

async function postWebhook(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.ok;
}

export const discordNotify: SkillDefinition = {
  id: "discord-notify",
  name: "Discord Notify",
  slug: "discord-notify",
  category: "Notification",
  description: "Send a notification to Discord via webhook.",
  icon: "message-square",
  permission: "notify",
  isEnabled: true,
  inputSchema: z.object({
    message: z.string().min(1),
    webhookUrl: z.string().url().optional(),
  }),
  async execute(input, ctx) {
    const url = input.webhookUrl || process.env.DISCORD_WEBHOOK_URL;
    if (!url) return { sent: false, error: "Set webhookUrl or DISCORD_WEBHOOK_URL" };
    await ctx.log("INFO", "Sending Discord notification", "discord-notify");
    const sent = await postWebhook(url, { content: input.message.slice(0, 2000) });
    return { sent, ok: sent };
  },
};

export const slackNotify: SkillDefinition = {
  id: "slack-notify",
  name: "Slack Notify",
  slug: "slack-notify",
  category: "Notification",
  description: "Send a notification to Slack via webhook.",
  icon: "hash",
  permission: "notify",
  isEnabled: true,
  inputSchema: z.object({
    message: z.string().min(1),
    webhookUrl: z.string().url().optional(),
  }),
  async execute(input, ctx) {
    const url = input.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (!url) return { sent: false, error: "Set webhookUrl or SLACK_WEBHOOK_URL" };
    await ctx.log("INFO", "Sending Slack notification", "slack-notify");
    const sent = await postWebhook(url, { text: input.message.slice(0, 3000) });
    return { sent, ok: sent };
  },
};

export const emailNotify: SkillDefinition = {
  id: "email-notify",
  name: "Email Notify",
  slug: "email-notify",
  category: "Notification",
  description: "Queue email notification (requires SMTP or webhook).",
  icon: "mail",
  permission: "notify",
  isEnabled: true,
  inputSchema: z.object({
    subject: z.string().min(1),
    message: z.string().min(1),
    to: z.string().email().optional(),
  }),
  async execute(input, ctx) {
    const webhook = process.env.EMAIL_WEBHOOK_URL;
    const to = input.to || process.env.NOTIFY_EMAIL_TO;
    await ctx.log("INFO", `Email notify: ${input.subject}`, "email-notify");

    if (webhook) {
      const sent = await postWebhook(webhook, {
        to,
        subject: input.subject,
        message: input.message,
      });
      return { sent, method: "webhook", ok: sent };
    }

    await prisma.alert.create({
      data: {
        userId: ctx.userId,
        agentId: ctx.agentId,
        type: "INFO",
        title: input.subject,
        message: input.message.slice(0, 500),
      },
    });

    return {
      sent: false,
      queuedAsAlert: true,
      note: "Email SMTP not configured — saved as dashboard alert. Set EMAIL_WEBHOOK_URL for direct send.",
      ok: true,
    };
  },
};
