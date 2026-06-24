import {
  isPythonRuntimeRequired,
  parsePythonRuntimePort,
  resolvePythonRuntimeUrl,
} from "./paths";

export interface PythonBlueprintCatalog {
  blueprints: Record<string, unknown>[];
  suggestions: Record<string, unknown>[];
  categories: string[];
}

export interface PythonFilledBlueprintJob {
  blueprintKey: string;
  slotValues: Record<string, unknown>;
  prompt: string;
  schedule: string;
  name: string;
  deliver: string;
  skills: string[];
}

class PythonRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PythonRuntimeError";
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = resolvePythonRuntimeUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new PythonRuntimeError(
      `Cannot reach AYRA Python runtime at ${base}. ` +
        `Run \`npm run python:setup\` and ensure \`npm run worker\` started it. ` +
        `(${error instanceof Error ? error.message : String(error)})`
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new PythonRuntimeError(payload.error ?? `Python runtime HTTP ${response.status}`);
  }

  return payload as T;
}

export async function isPythonRuntimeHealthy(): Promise<boolean> {
  try {
    const data = await fetchJson<{ ok?: boolean }>("/health", { method: "GET" });
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function fetchBlueprintCatalogFromPython(): Promise<PythonBlueprintCatalog> {
  return fetchJson<PythonBlueprintCatalog>("/v1/blueprints", { method: "GET" });
}

export async function fillBlueprintViaPython(
  blueprintKey: string,
  values: Record<string, unknown> = {}
): Promise<PythonFilledBlueprintJob> {
  return fetchJson<PythonFilledBlueprintJob>("/v1/blueprints/fill", {
    method: "POST",
    body: JSON.stringify({ blueprintKey, values }),
  });
}

export async function getNextCronRunViaPython(
  schedule: string,
  after?: Date
): Promise<Date> {
  const data = await fetchJson<{ nextRun: string }>("/v1/cron/next", {
    method: "POST",
    body: JSON.stringify({
      schedule,
      after: after?.toISOString(),
    }),
  });
  return new Date(data.nextRun);
}

export { PythonRuntimeError, isPythonRuntimeRequired, parsePythonRuntimePort };
