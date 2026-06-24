import "dotenv/config";
import { acquireWorkerLock } from "../lib/worker/single-instance";
import { startScheduler } from "../lib/agent/scheduler-worker";
import { startBrainWorker } from "../lib/brain/brain-worker";
import { startTelegramPolling } from "../lib/telegram/polling";
import {
  ensureAgentMemoryRunning,
  stopAgentMemoryServer,
} from "../lib/agentmemory/spawn-server";
import {
  ensurePythonRuntime,
  ensurePythonTelegramGateway,
  stopAllPythonServices,
} from "../lib/python/spawn-runtime";
import { isTelegramPythonEnabled } from "../lib/python/paths";
import { deleteTelegramWebhook } from "../lib/telegram/client";
import { dedupeTelegramChatIds } from "../lib/telegram/bots-config";
import { listTelegramBotConfigs } from "../lib/telegram/bots-config";
import {
  startWorkerInternalServer,
  stopWorkerInternalServer,
} from "../lib/worker/internal-server";

async function main() {
  acquireWorkerLock();
  console.log("[AYRA Worker] Starting...");
  startWorkerInternalServer();
  await ensurePythonRuntime();
  await ensureAgentMemoryRunning();
  await startScheduler();
  startBrainWorker();

  const telegramEnabled =
    process.env.TELEGRAM_POLLING !== "false" ||
    Boolean(process.env.TELEGRAM_BOT_TOKEN);

  if (telegramEnabled) {
    await dedupeTelegramChatIds();
    const bots = await listTelegramBotConfigs();
    for (const bot of bots) {
      await deleteTelegramWebhook(bot.botToken);
    }

    if (isTelegramPythonEnabled()) {
      await ensurePythonTelegramGateway();
    } else if (process.env.TELEGRAM_POLLING === "true") {
      await startTelegramPolling();
    }
  }

  const shutdown = () => {
    console.log("[AYRA Worker] Shutting down...");
    stopAgentMemoryServer();
    stopAllPythonServices();
    stopWorkerInternalServer();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[AYRA Worker] Fatal error:", err);
  process.exit(1);
});
