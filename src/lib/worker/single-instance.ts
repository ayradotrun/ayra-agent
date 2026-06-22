import fs from "fs";
import path from "path";

const LOCK_PATH = path.join(process.cwd(), ".ayra-worker.lock");

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Prevent two worker processes from polling Telegram with the same bot token. */
export function acquireWorkerLock(): void {
  if (fs.existsSync(LOCK_PATH)) {
    const raw = fs.readFileSync(LOCK_PATH, "utf8").trim();
    const pid = Number.parseInt(raw, 10);
    if (Number.isFinite(pid) && isProcessAlive(pid)) {
      console.error(
        `[AYRA Worker] Another worker is already running (PID ${pid}). Stop it first, then retry.`
      );
      process.exit(1);
    }
  }

  fs.writeFileSync(LOCK_PATH, String(process.pid));

  const release = () => {
    try {
      if (fs.existsSync(LOCK_PATH) && fs.readFileSync(LOCK_PATH, "utf8").trim() === String(process.pid)) {
        fs.unlinkSync(LOCK_PATH);
      }
    } catch {
      /* ignore */
    }
  };

  process.on("exit", release);
  process.on("SIGINT", release);
  process.on("SIGTERM", release);
}
