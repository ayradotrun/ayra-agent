import "dotenv/config";
import { acquireWorkerLock } from "../lib/worker/single-instance";
import { startScheduler } from "../lib/agent/scheduler-worker";
import { startBrainWorker } from "../lib/brain/brain-worker";
import { startTelegramPolling } from "../lib/telegram/polling";
import {
  ensureAgentMemoryRunning,
  stopAgentMemoryServer,
} from "../lib/agentmemory/spawn-server";

async function main() {
  acquireWorkerLock();
  console.log("[AYRA Worker] Starting...");
  await ensureAgentMemoryRunning();
  await startScheduler();
  startBrainWorker();

  if (process.env.TELEGRAM_POLLING === "true") {
    await startTelegramPolling();
  }

  const shutdown = () => {
    console.log("[AYRA Worker] Shutting down...");
    stopAgentMemoryServer();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[AYRA Worker] Fatal error:", err);
  process.exit(1);
});
