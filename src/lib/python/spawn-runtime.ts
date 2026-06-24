import { spawn, execSync, type ChildProcess } from "child_process";
import {
  isPythonRuntimeHealthy,
  parsePythonRuntimePort,
} from "./runtime-client";
import {
  isPythonRuntimeRequired,
  resolvePythonBin,
  resolvePythonPackageRoot,
  resolvePythonRuntimeUrl,
} from "./paths";
import {
  acquireTelegramGatewayLock,
  clearStaleTelegramGatewayLock,
  isTelegramGatewayRunning,
  releaseTelegramGatewayLock,
  writeTelegramGatewayLock,
} from "../telegram/gateway-lock";

let spawnedChild: ChildProcess | null = null;
let weSpawned = false;
let telegramSpawnedChild: ChildProcess | null = null;
let weSpawnedTelegram = false;

async function waitForHealth(maxMs = 60_000, intervalMs = 1_000): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isPythonRuntimeHealthy()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function runtimeSpawnArgs(port: number): string[] {
  return ["-m", "ayra.runtime_server", "--host", "127.0.0.1", "--port", String(port)];
}

function pythonSpawnEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PYTHONPATH: resolvePythonPackageRoot(),
  };
}

function attachPythonLogs(child: ChildProcess, prefix: string): void {
  child.stdout?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) console.log(`${prefix} ${line}`);
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) console.error(`${prefix} ${line}`);
    }
  });
}

function killSpawnedChild(child: ChildProcess | null): void {
  if (!child?.pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { shell: true });
    } else {
      try {
        execSync(`pkill -P ${child.pid} 2>/dev/null || true`, { stdio: "ignore" });
      } catch {
        /* ignore */
      }
      child.kill("SIGTERM");
    }
  } catch {
    /* ignore */
  }
}

/** PM2 restarts can leave orphan Python pollers → Telegram 409 Conflict. */
function killOrphanTelegramGateways(): void {
  if (process.platform === "win32") return;
  try {
    execSync("pkill -f 'ayra.telegram_gateway' 2>/dev/null || true", { stdio: "ignore" });
  } catch {
    /* ignore */
  }
}

function telegramSpawnArgs(): string[] {
  return ["-m", "ayra.telegram_gateway"];
}

/** Foreground Python Telegram gateway (npm run python:telegram). */
export function runPythonTelegramGatewayForeground(): void {
  if (isTelegramGatewayRunning()) {
    console.error(
      "[AYRA Telegram/Python] Gateway already running. Stop the other process first (worker or python:telegram)."
    );
    process.exit(1);
  }
  if (!acquireTelegramGatewayLock()) {
    console.error("[AYRA Telegram/Python] Could not acquire gateway lock.");
    process.exit(1);
  }

  const pythonBin = resolvePythonBin();
  console.log("[AYRA Telegram/Python] Starting gateway…");
  console.log("[AYRA Telegram/Python] Press Ctrl+C to stop.");

  const child = spawn(pythonBin, telegramSpawnArgs(), {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
    env: pythonSpawnEnv(),
  });

  child.on("exit", (code, signal) => {
    releaseTelegramGatewayLock();
    if (signal) {
      process.exit(0);
      return;
    }
    process.exit(code ?? 1);
  });
}

/** Foreground Python runtime (npm run python:runtime). */
export function runPythonRuntimeForeground(): void {
  const base = resolvePythonRuntimeUrl();
  const port = parsePythonRuntimePort(base);
  const pythonBin = resolvePythonBin();
  const pkgRoot = resolvePythonPackageRoot();

  console.log(`[AYRA Python] Starting on port ${port} (${base})…`);
  console.log("[AYRA Python] Press Ctrl+C to stop.");

  const child = spawn(pythonBin, runtimeSpawnArgs(port), {
    stdio: "inherit",
    shell: true,
    cwd: process.cwd(),
    env: {
      ...process.env,
      PYTHONPATH: pkgRoot,
    },
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(0);
      return;
    }
    process.exit(code ?? 1);
  });
}

/**
 * Ensure the AYRA Python runtime is running. Required by default
 * (AYRA_PYTHON_REQUIRED=true). Worker and cron APIs depend on it.
 */
export async function ensurePythonRuntime(): Promise<void> {
  if (await isPythonRuntimeHealthy()) {
    console.log("[AYRA Python] Runtime already running — skip auto-start.");
    return;
  }

  const base = resolvePythonRuntimeUrl();
  const port = parsePythonRuntimePort(base);
  const pythonBin = resolvePythonBin();

  console.log(`[AYRA Python] Auto-starting runtime on port ${port}…`);

  spawnedChild = spawn(pythonBin, runtimeSpawnArgs(port), {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    detached: false,
    cwd: process.cwd(),
    env: pythonSpawnEnv(),
  });
  weSpawned = true;

  attachPythonLogs(spawnedChild, "[AYRA Python]");

  spawnedChild.on("exit", (code, signal) => {
    if (weSpawned) {
      console.warn(
        `[AYRA Python] Process exited (code=${code ?? "null"}, signal=${signal ?? "null"})`
      );
    }
    spawnedChild = null;
    weSpawned = false;
  });

  const ok = await waitForHealth(60_000);
  if (ok) {
    console.log(`[AYRA Python] Ready at ${base}`);
    return;
  }

  const message =
    "[AYRA Python] Runtime did not become healthy in time. " +
    "Install deps: npm run python:setup. " +
    "Or run `npm run python:runtime` in another terminal.";

  if (isPythonRuntimeRequired()) {
    throw new Error(message);
  }

  console.warn(message);
}

export function stopPythonRuntime(): void {
  if (!spawnedChild || !weSpawned) return;
  killSpawnedChild(spawnedChild);
  spawnedChild = null;
  weSpawned = false;
}

/** Start Python Telegram gateway (python-telegram-bot → worker internal API). */
export async function ensurePythonTelegramGateway(): Promise<void> {
  clearStaleTelegramGatewayLock();
  killOrphanTelegramGateways();
  await new Promise((r) => setTimeout(r, 2_000));

  if (isTelegramGatewayRunning()) {
    console.log("[AYRA Telegram/Python] Gateway already running — skip auto-start.");
    return;
  }

  if (!acquireTelegramGatewayLock()) {
    console.log("[AYRA Telegram/Python] Gateway lock held by another process — skip auto-start.");
    return;
  }

  const pythonBin = resolvePythonBin();

  console.log("[AYRA Telegram/Python] Auto-starting gateway…");

  telegramSpawnedChild = spawn(pythonBin, telegramSpawnArgs(), {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    detached: false,
    cwd: process.cwd(),
    env: pythonSpawnEnv(),
  });
  weSpawnedTelegram = true;

  if (telegramSpawnedChild.pid) {
    writeTelegramGatewayLock(telegramSpawnedChild.pid);
  }

  attachPythonLogs(telegramSpawnedChild, "[AYRA Telegram/Python]");

  telegramSpawnedChild.on("exit", (code, signal) => {
    releaseTelegramGatewayLock();
    if (weSpawnedTelegram) {
      console.warn(
        `[AYRA Telegram/Python] Process exited (code=${code ?? "null"}, signal=${signal ?? "null"})`
      );
    }
    telegramSpawnedChild = null;
    weSpawnedTelegram = false;
  });

  // Gateway waits for worker internal API — brief pause for startup ordering
  await new Promise((r) => setTimeout(r, 2_000));
  console.log("[AYRA Telegram/Python] Gateway process started");
}

export function stopPythonTelegramGateway(): void {
  if (!telegramSpawnedChild || !weSpawnedTelegram) return;
  killSpawnedChild(telegramSpawnedChild);
  telegramSpawnedChild = null;
  weSpawnedTelegram = false;
  releaseTelegramGatewayLock();
}

export function stopAllPythonServices(): void {
  stopPythonTelegramGateway();
  stopPythonRuntime();
}
