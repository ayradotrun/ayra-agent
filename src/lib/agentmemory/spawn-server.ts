import { spawn, type ChildProcess } from "child_process";
import { isAgentMemoryAvailable, resolveAgentMemoryUrl } from "./client";

let spawnedChild: ChildProcess | null = null;
let weSpawned = false;

function parsePortFromUrl(url: string): number {
  try {
    const u = new URL(url);
    if (u.port) return Number.parseInt(u.port, 10);
    return u.protocol === "https:" ? 443 : 3111;
  } catch {
    return 3111;
  }
}

function npxArgs(port: number): string[] {
  return ["-y", "@agentmemory/agentmemory@latest", "--port", String(port)];
}

/** Foreground AgentMemory server (npm run agentmemory). */
export function runAgentMemoryServerForeground(): void {
  const base = resolveAgentMemoryUrl();
  const port = parsePortFromUrl(base);

  console.log(`[AgentMemory] Starting on port ${port} (${base})…`);
  console.log("[AgentMemory] Viewer: http://127.0.0.1:" + (port + 2));
  console.log("[AgentMemory] Press Ctrl+C to stop.");

  const child = spawn("npx", npxArgs(port), {
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exit(0);
      return;
    }
    process.exit(code ?? 1);
  });
}

async function waitForHealth(
  userUrl?: string | null,
  maxMs = 90_000,
  intervalMs = 2_000
): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    if (await isAgentMemoryAvailable(userUrl)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

/**
 * Start AgentMemory in the background when AGENTMEMORY_AUTO_START=true
 * and no server is already listening.
 */
export async function ensureAgentMemoryRunning(): Promise<void> {
  if (process.env.AGENTMEMORY_AUTO_START !== "true") return;

  const userUrl = process.env.AGENTMEMORY_URL ?? null;
  if (await isAgentMemoryAvailable(userUrl)) {
    console.log("[AgentMemory] Already running — skip auto-start.");
    return;
  }

  const base = resolveAgentMemoryUrl(userUrl);
  const port = parsePortFromUrl(base);

  console.log(`[AgentMemory] Auto-starting on port ${port}…`);

  spawnedChild = spawn("npx", npxArgs(port), {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    detached: false,
  });
  weSpawned = true;

  spawnedChild.stdout?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) console.log(`[AgentMemory] ${line}`);
    }
  });
  spawnedChild.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) console.error(`[AgentMemory] ${line}`);
    }
  });

  spawnedChild.on("exit", (code, signal) => {
    if (weSpawned) {
      console.warn(`[AgentMemory] Process exited (code=${code ?? "null"}, signal=${signal ?? "null"})`);
    }
    spawnedChild = null;
    weSpawned = false;
  });

  const ok = await waitForHealth(userUrl, 90_000);
  if (ok) {
    console.log(`[AgentMemory] Ready at ${base}`);
    return;
  }

  console.warn(
    "[AgentMemory] Auto-start did not become healthy in time. " +
      "Run `npm run agentmemory` in another terminal, or check WSL2 on Windows."
  );
}

export function stopAgentMemoryServer(): void {
  if (!spawnedChild || !weSpawned) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(spawnedChild.pid), "/f", "/t"], { shell: true });
    } else {
      spawnedChild.kill("SIGTERM");
    }
  } catch {
    /* ignore */
  }
  spawnedChild = null;
  weSpawned = false;
}
