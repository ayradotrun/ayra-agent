import path from "path";

export function resolvePythonBin(): string {
  const fromEnv = process.env.AYRA_PYTHON_BIN?.trim();
  if (fromEnv) return fromEnv;
  return process.platform === "win32" ? "python" : "python3";
}

export function resolvePythonPackageRoot(): string {
  return path.join(process.cwd(), "python");
}

export function resolvePythonRuntimeUrl(): string {
  const fromEnv = process.env.AYRA_PYTHON_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const port = Number.parseInt(process.env.AYRA_PYTHON_PORT ?? "8765", 10);
  return `http://127.0.0.1:${port}`;
}

export function parsePythonRuntimePort(url: string): number {
  try {
    const u = new URL(url);
    if (u.port) return Number.parseInt(u.port, 10);
    return u.protocol === "https:" ? 443 : 8765;
  } catch {
    return 8765;
  }
}

export function isPythonRuntimeRequired(): boolean {
  const raw = process.env.AYRA_PYTHON_REQUIRED;
  if (raw === undefined || raw === "") return true;
  return raw.trim().toLowerCase() !== "false";
}

/** Use Python telegram gateway (default true). Set AYRA_TELEGRAM_PYTHON=false for legacy TS polling. */
export function isTelegramPythonEnabled(): boolean {
  const raw = process.env.AYRA_TELEGRAM_PYTHON;
  if (raw === undefined || raw === "") return true;
  return raw.trim().toLowerCase() !== "false";
}
