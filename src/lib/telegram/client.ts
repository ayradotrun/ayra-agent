import { randomBytes } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { decryptSafe } from "@/lib/encryption";

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string };
    text?: string;
    from?: { id: number; username?: string; first_name?: string };
  };
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string
): Promise<boolean> {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4096),
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    // Retry without markdown if parse failed
    const fallback = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4096) }),
    });
    return fallback.ok;
  }
  return true;
}

export async function sendTelegramPhoto(
  botToken: string,
  chatId: string | number,
  filePath: string,
  caption?: string
): Promise<boolean> {
  const buffer = await readFile(filePath);
  const ext = path.extname(filePath).slice(1) || "png";
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;

  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append(
    "photo",
    new Blob([buffer], { type: mime }),
    path.basename(filePath)
  );
  if (caption) {
    form.append("caption", caption.slice(0, 1024));
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    body: form,
  });

  return response.ok;
}

export async function deleteTelegramWebhook(botToken: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drop_pending_updates: false }),
  });
}

export async function registerTelegramWebhook(
  botToken: string,
  webhookSecret: string
): Promise<{ ok: boolean; description?: string }> {
  const base = process.env.TELEGRAM_WEBHOOK_URL || process.env.NEXTAUTH_URL || "";
  if (!base || base.includes("localhost") || base.includes("127.0.0.1")) {
    return { ok: false, description: "Use TELEGRAM_POLLING=true for local dev" };
  }

  const url = `${base.replace(/\/$/, "")}/api/telegram/webhook/${webhookSecret}`;
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, allowed_updates: ["message"] }),
  });

  const data = (await response.json()) as { ok: boolean; description?: string };
  return data;
}

export async function fetchTelegramUpdates(
  botToken: string,
  offset: number
): Promise<TelegramUpdate[]> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=25&allowed_updates=${encodeURIComponent(JSON.stringify(["message"]))}`
  );
  if (!response.ok) return [];
  const data = (await response.json()) as { ok: boolean; result?: TelegramUpdate[] };
  return data.result ?? [];
}

export function getBotTokenFromUser(user: {
  telegramBotToken?: string | null;
}): string | null {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  if (user.telegramBotToken) return decryptSafe(user.telegramBotToken);
  return envToken || null;
}

export function generateWebhookSecret(): string {
  return randomBytes(24).toString("hex");
}

export async function setTelegramBotCommands(botToken: string): Promise<void> {
  const { getAllTelegramBotCommands } = await import("./commands");
  await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands: getAllTelegramBotCommands() }),
  });
}
