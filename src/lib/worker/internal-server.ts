import http from "http";
import type { IncomingMessage, ServerResponse } from "http";
import { verifyInternalRequest } from "@/lib/internal-api/auth";
import {
  listTelegramBotConfigs,
  resolveTelegramUserForChat,
  formatTelegramLinkReply,
} from "@/lib/telegram/bots-config";
import { dispatchTelegramUpdateForPython } from "@/lib/telegram/handler";
import { getTelegramReadiness } from "@/lib/chat";
import { claimTelegramUpdateForUser } from "@/lib/telegram/claim-update";
import type { TelegramUpdate } from "@/lib/telegram/client";

let server: http.Server | null = null;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function unauthorized(res: ServerResponse): void {
  sendJson(res, 401, { error: "Unauthorized" });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!verifyInternalRequest(req)) {
    unauthorized(res);
    return;
  }

  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (req.method === "GET" && path === "/internal/telegram/bots") {
    const bots = await listTelegramBotConfigs();
    sendJson(res, 200, { bots });
    return;
  }

  if (req.method === "GET" && path === "/internal/telegram/readiness") {
    const userId = url.searchParams.get("userId")?.trim();
    if (!userId) {
      sendJson(res, 400, { error: "userId is required" });
      return;
    }
    const readiness = await getTelegramReadiness(userId);
    sendJson(res, 200, readiness);
    return;
  }

  if (req.method === "POST" && path === "/internal/telegram/claim") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || "{}") as { userId?: string; updateId?: number };
      if (!body.userId || body.updateId == null) {
        sendJson(res, 400, { error: "userId and updateId are required" });
        return;
      }
      const claimed = await claimTelegramUpdateForUser(body.userId, body.updateId);
      sendJson(res, 200, { claimed });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Claim failed";
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === "POST" && path === "/internal/telegram/dispatch") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || "{}") as {
        userId?: string;
        update?: TelegramUpdate;
        thinkingMessageId?: number;
        skipClaim?: boolean;
      };

      if (!body.userId || !body.update) {
        sendJson(res, 400, { error: "userId and update are required" });
        return;
      }

      const result = await dispatchTelegramUpdateForPython(
        body.userId,
        body.update,
        body.thinkingMessageId,
        { skipClaim: body.skipClaim === true }
      );

      sendJson(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Dispatch failed";
      sendJson(res, 500, { error: message });
    }
    return;
  }

  if (req.method === "GET" && path === "/internal/telegram/resolve") {
    const chatId = url.searchParams.get("chatId")?.trim();
    const botToken = url.searchParams.get("botToken")?.trim();
    if (!chatId || !botToken) {
      sendJson(res, 400, { error: "chatId and botToken are required" });
      return;
    }
    const configs = await listTelegramBotConfigs();
    const tokenUsers = configs.filter((c) => c.botToken === botToken);
    const resolved = resolveTelegramUserForChat(tokenUsers, chatId);
    if (!resolved.ok) {
      sendJson(res, 200, {
        ok: false,
        reason: resolved.reason,
        message: formatTelegramLinkReply(resolved.reason),
      });
      return;
    }
    sendJson(res, 200, { ok: true, userId: resolved.userId });
    return;
  }

  if (req.method === "GET" && path === "/health") {
    sendJson(res, 200, { ok: true, service: "ayra-worker-internal" });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

export function startWorkerInternalServer(): void {
  if (server) return;

  const port = Number.parseInt(process.env.AYRA_WORKER_INTERNAL_PORT ?? "8790", 10);
  const host = process.env.AYRA_WORKER_INTERNAL_HOST ?? "127.0.0.1";

  server = http.createServer((req, res) => {
    void handleRequest(req, res).catch((error) => {
      console.error("[AYRA Worker Internal] Request error:", error);
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Internal error" });
      }
    });
  });

  server.listen(port, host, () => {
    console.log(`[AYRA Worker Internal] Listening on http://${host}:${port}`);
  });
}

export function stopWorkerInternalServer(): void {
  if (!server) return;
  server.close();
  server = null;
}

export function workerInternalBaseUrl(): string {
  const host = process.env.AYRA_WORKER_INTERNAL_HOST ?? "127.0.0.1";
  const port = process.env.AYRA_WORKER_INTERNAL_PORT ?? "8790";
  return `http://${host}:${port}`;
}
