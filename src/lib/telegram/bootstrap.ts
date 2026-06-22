import "server-only";

const TELEGRAM_POLLING_STARTED = Symbol.for("ayra.telegram.polling.started");

export async function ensureTelegramPollingStarted(): Promise<void> {
  if (process.env.TELEGRAM_POLLING !== "true") return;

  const g = globalThis as typeof globalThis & { [TELEGRAM_POLLING_STARTED]?: boolean };
  if (g[TELEGRAM_POLLING_STARTED]) return;
  g[TELEGRAM_POLLING_STARTED] = true;

  const { startTelegramPolling } = await import("./polling");
  await startTelegramPolling();
}
