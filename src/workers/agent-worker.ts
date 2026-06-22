import "dotenv/config";
import { acquireWorkerLock } from "../lib/worker/single-instance";
import { startScheduler } from "../lib/agent/scheduler-worker";
import { startMemeAlertWorker } from "../lib/agent/meme-alert-worker";
import { startTelegramPolling } from "../lib/telegram/polling";

async function main() {
  acquireWorkerLock();
  console.log("[AYRA Worker] Starting...");
  await startScheduler();
  startMemeAlertWorker();

  if (process.env.TELEGRAM_POLLING === "true") {
    await startTelegramPolling();
  }

  process.on("SIGINT", () => {
    console.log("[AYRA Worker] Shutting down...");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("[AYRA Worker] Shutting down...");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[AYRA Worker] Fatal error:", err);
  process.exit(1);
});
