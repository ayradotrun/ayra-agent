const DEFAULT_AGENTMEMORY_URL = "http://127.0.0.1:3111";
const AVAILABILITY_CACHE_MS = 120_000;
const availabilityCache = new Map<string, { ok: boolean; at: number }>();

export function resolveAgentMemoryUrl(userUrl?: string | null): string {
  const fromUser = userUrl?.trim();
  if (fromUser) return fromUser.replace(/\/+$/, "");
  const fromEnv = process.env.AGENTMEMORY_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return DEFAULT_AGENTMEMORY_URL;
}

function authHeaders(secret?: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = secret?.trim() || process.env.AGENTMEMORY_SECRET?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function isAgentMemoryAvailable(
  userUrl?: string | null,
  secret?: string | null
): Promise<boolean> {
  const base = resolveAgentMemoryUrl(userUrl);
  const cacheKey = base;
  const cached = availabilityCache.get(cacheKey);
  if (cached && Date.now() - cached.at < AVAILABILITY_CACHE_MS) {
    return cached.ok;
  }

  try {
    const res = await fetch(`${base}/agentmemory/health`, {
      headers: authHeaders(secret),
      signal: AbortSignal.timeout(1_500),
    });
    const ok = res.ok;
    availabilityCache.set(cacheKey, { ok, at: Date.now() });
    return ok;
  } catch {
    availabilityCache.set(cacheKey, { ok: false, at: Date.now() });
    return false;
  }
}

export interface AgentMemoryHit {
  content: string;
  score?: number;
  source?: string;
}

export async function agentMemorySmartSearch(
  query: string,
  opts: { limit?: number; userUrl?: string | null; secret?: string | null } = {}
): Promise<AgentMemoryHit[]> {
  const available = await isAgentMemoryAvailable(opts.userUrl, opts.secret);
  if (!available) return [];

  const base = resolveAgentMemoryUrl(opts.userUrl);
  const limit = opts.limit ?? 5;
  try {
    const res = await fetch(`${base}/agentmemory/smart-search`, {
      method: "POST",
      headers: authHeaders(opts.secret),
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{ content?: string; text?: string; score?: number; source?: string }>;
      memories?: Array<{ content?: string; text?: string; score?: number; source?: string }>;
    };
    const rows = data.results ?? data.memories ?? [];
    return rows
      .map((row) => ({
        content: (row.content ?? row.text ?? "").trim(),
        score: row.score,
        source: row.source,
      }))
      .filter((row) => row.content.length > 0);
  } catch {
    return [];
  }
}

export async function agentMemorySave(
  content: string,
  opts: {
    tags?: string[];
    userUrl?: string | null;
    secret?: string | null;
    sessionId?: string;
  } = {}
): Promise<boolean> {
  const available = await isAgentMemoryAvailable(opts.userUrl, opts.secret);
  if (!available) return false;

  const base = resolveAgentMemoryUrl(opts.userUrl);
  try {
    const res = await fetch(`${base}/agentmemory/remember`, {
      method: "POST",
      headers: authHeaders(opts.secret),
      body: JSON.stringify({
        content,
        tags: opts.tags ?? [],
        session_id: opts.sessionId,
      }),
      signal: AbortSignal.timeout(4_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
