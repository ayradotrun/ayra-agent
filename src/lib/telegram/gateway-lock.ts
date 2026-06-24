import fs from "fs";
import path from "path";

const LOCK_PATH = path.join(process.cwd(), ".ayra-telegram-gateway.lock");

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Only one Python Telegram gateway should poll a bot token. */
export function isTelegramGatewayRunning(): boolean {
  if (!fs.existsSync(LOCK_PATH)) return false;
  const raw = fs.readFileSync(LOCK_PATH, "utf8").trim();
  const pid = Number.parseInt(raw, 10);
  return Number.isFinite(pid) && isProcessAlive(pid);
}

export function acquireTelegramGatewayLock(): boolean {
  if (isTelegramGatewayRunning()) return false;

  fs.writeFileSync(LOCK_PATH, String(process.pid));

  const release = () => {
    try {
      if (
        fs.existsSync(LOCK_PATH) &&
        fs.readFileSync(LOCK_PATH, "utf8").trim() === String(process.pid)
      ) {
        fs.unlinkSync(LOCK_PATH);
      }
    } catch {
      /* ignore */
    }
  };

  process.on("exit", release);
  process.on("SIGINT", release);
  process.on("SIGTERM", release);
  return true;
}

export function releaseTelegramGatewayLock(): void {
  try {
    if (fs.existsSync(LOCK_PATH)) fs.unlinkSync(LOCK_PATH);
  } catch {
    /* ignore */
  }
}

/** Track the Python gateway PID (not the Node worker PID). */
export function writeTelegramGatewayLock(pid: number): void {
  fs.writeFileSync(LOCK_PATH, String(pid));
}

/** Remove lock when the recorded gateway process is gone. */
export function clearStaleTelegramGatewayLock(): void {
  if (!fs.existsSync(LOCK_PATH)) return;
  const raw = fs.readFileSync(LOCK_PATH, "utf8").trim();
  const pid = Number.parseInt(raw, 10);
  if (!Number.isFinite(pid) || !isProcessAlive(pid)) {
    releaseTelegramGatewayLock();
  }
}
