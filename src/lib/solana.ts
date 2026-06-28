import { decryptSafe } from "@/lib/encryption";

const PUBLIC_RPC_FALLBACKS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
] as const;

export const DEFAULT_SOLANA_RPC = PUBLIC_RPC_FALLBACKS[0];

export interface SolanaRpcRequest {
  url: string;
  headers: Record<string, string>;
  label: string;
}

export interface SolanaRpcUserSettings {
  solanaDefaultRpc?: string | null;
  solanaRpcApiKey?: string | null;
  fallbackRpcUrls?: string[] | null;
}

export interface SolanaRpcCallOptions {
  rpcUrl?: string;
  apiKey?: string;
  fallbackRpcUrls?: string[];
  /** User/account RPC — never inject SOLANA_RPC_* from server .env */
  userScoped?: boolean;
}

export function resolveSolanaPrimaryRpc(user?: SolanaRpcUserSettings | null): string {
  return user?.solanaDefaultRpc?.trim() || DEFAULT_SOLANA_RPC;
}

/** Per-user RPC for wallet/token skills (/w, /n, etc.) — Settings → Solana, else public mainnet. */
function resolveUserRpcApiKey(
  user?: SolanaRpcUserSettings | null,
  rpcUrl?: string
): string | undefined {
  const stored = user?.solanaRpcApiKey ? decryptSafe(user.solanaRpcApiKey) : undefined;
  if (stored?.trim()) return stored.trim();
  if (rpcUrl) return extractRpcApiKeyFromUrl(rpcUrl);
  return undefined;
}

export function getSolanaRpcOptions(user?: SolanaRpcUserSettings | null): SolanaRpcCallOptions {
  const rpcUrl = resolveSolanaPrimaryRpc(user);
  return {
    rpcUrl,
    apiKey: resolveUserRpcApiKey(user, rpcUrl),
    fallbackRpcUrls: (user?.fallbackRpcUrls ?? []).map((u) => u.trim()).filter(Boolean),
    userScoped: true,
  };
}

/** Server ops monitor — may use SOLANA_RPC_URL from .env */
export function getServerSolanaRpcOptions(): SolanaRpcCallOptions {
  return {
    rpcUrl: process.env.SOLANA_RPC_URL?.trim() || DEFAULT_SOLANA_RPC,
    apiKey: process.env.SOLANA_RPC_API_KEY?.trim() || undefined,
    userScoped: false,
  };
}

function urlHasEmbeddedKey(url: string): boolean {
  return !!extractRpcApiKeyFromUrl(url);
}

/** Read api-key from query string or path segment (Helius, QuickNode, etc.). */
export function extractRpcApiKeyFromUrl(rpcUrl: string): string | undefined {
  try {
    const parsed = new URL(rpcUrl.trim());
    const fromQuery =
      parsed.searchParams.get("api-key") ||
      parsed.searchParams.get("api_key") ||
      parsed.searchParams.get("key");
    if (fromQuery?.trim()) return fromQuery.trim();
    const pathMatch = parsed.pathname.match(/\/([a-f0-9]{32,})\/?$/i);
    if (pathMatch?.[1]) return pathMatch[1];
  } catch {
    /* ignore */
  }
  return undefined;
}

export function buildSolanaRpcRequest(
  rpcUrl: string,
  apiKey?: string,
  label?: string
): SolanaRpcRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let url = rpcUrl.trim();

  if (apiKey && !urlHasEmbeddedKey(url)) {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("helius") || process.env.SOLANA_RPC_AUTH_STYLE === "query") {
      parsed.searchParams.set("api-key", apiKey);
      url = parsed.toString();
    } else if (
      process.env.SOLANA_RPC_AUTH_STYLE === "bearer" ||
      host.includes("alchemy") ||
      host.includes("ankr.com")
    ) {
      headers.Authorization = `Bearer ${apiKey}`;
    } else {
      parsed.searchParams.set("api-key", apiKey);
      url = parsed.toString();
    }
  }

  return { url, headers, label: label ?? maskRpcUrl(url) };
}

function maskRpcUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("api-key")) {
      parsed.searchParams.set("api-key", "••••");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getSolanaRpcRequests(options?: SolanaRpcCallOptions): SolanaRpcRequest[] {
  const userScoped = options?.userScoped === true;
  const primaryUrl =
    options?.rpcUrl?.trim() ||
    (userScoped ? DEFAULT_SOLANA_RPC : process.env.SOLANA_RPC_URL?.trim() || DEFAULT_SOLANA_RPC);

  const apiKey = userScoped
    ? options?.apiKey?.trim() || undefined
    : options?.apiKey?.trim() || process.env.SOLANA_RPC_API_KEY?.trim() || undefined;
  const userFallbacks = (options?.fallbackRpcUrls ?? []).map((u) => u.trim()).filter(Boolean);
  const seen = new Set<string>();
  const requests: SolanaRpcRequest[] = [];

  const add = (url: string, key?: string, label?: string) => {
    const built = buildSolanaRpcRequest(url, key, label);
    if (seen.has(built.url)) return;
    seen.add(built.url);
    requests.push(built);
  };

  // 1) Primary RPC — API key applied when set (Helius, QuickNode, etc.)
  add(primaryUrl, apiKey, apiKey ? "primary (with API key)" : "primary");

  // 2) User-configured fallback RPCs (same API key when applicable)
  userFallbacks.forEach((url, i) => {
    if (url === primaryUrl) return;
    add(url, apiKey, `fallback-${i + 1}`);
  });

  // 3) Server env RPC if different (ops / monitor only — not user-scoped)
  if (
    !userScoped &&
    process.env.SOLANA_RPC_URL &&
    process.env.SOLANA_RPC_URL !== primaryUrl
  ) {
    add(process.env.SOLANA_RPC_URL, process.env.SOLANA_RPC_API_KEY, "env");
  }

  // 4) Built-in public endpoints (no API key)
  for (const fallback of PUBLIC_RPC_FALLBACKS) {
    add(fallback, undefined, "public");
  }

  return requests;
}

function rpcAuthHint(status: number): string {
  if (status === 401 || status === 403) {
    return (
      " RPC rejected the request (missing or invalid API key). " +
      "Set a full URL with your key in Dashboard → Settings → Solana."
    );
  }
  return "";
}

async function solanaRpcOnce<T>(
  request: SolanaRpcRequest,
  method: string,
  params: unknown[]
): Promise<T> {
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });

  if (!response.ok) {
    throw new Error(
      `Solana RPC HTTP ${response.status} (${request.label})${rpcAuthHint(response.status)}`
    );
  }

  const data = await response.json();
  if (data.error) {
    const msg = data.error.message || "Solana RPC error";
    if (/unauthorized|invalid api key|api key/i.test(msg)) {
      throw new Error(`${msg} (${request.label})${rpcAuthHint(401)}`);
    }
    throw new Error(`${msg} (${request.label})`);
  }

  return data.result as T;
}

export async function solanaRpc<T>(
  method: string,
  params: unknown[],
  options?: SolanaRpcCallOptions
): Promise<T> {
  const requests = getSolanaRpcRequests(options);
  let lastError: Error | null = null;

  for (const request of requests) {
    try {
      return await solanaRpcOnce<T>(request, method, params);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const retryable =
        /HTTP 401|HTTP 403|unauthorized|invalid api key|api key/i.test(err.message);
      if (retryable) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw (
    lastError ??
    new Error(
      "All Solana RPC endpoints failed. Configure a valid RPC URL and API key in Settings → Solana."
    )
  );
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

function parseLamportsResult(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === "object" && "value" in raw) {
    const value = (raw as { value: unknown }).value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  }
  return 0;
}

export async function getSolBalance(wallet: string, options?: SolanaRpcCallOptions) {
  const raw = await solanaRpc<unknown>("getBalance", [wallet], options);
  const lamports = parseLamportsResult(raw);
  return { lamports, sol: lamportsToSol(lamports) };
}

const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const SPL_TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

function parseTokenUiAmount(info: {
  tokenAmount?: {
    uiAmount?: number | null;
    uiAmountString?: string;
    amount?: string;
    decimals?: number;
  };
}): number {
  const ui = info.tokenAmount?.uiAmount;
  if (typeof ui === "number" && Number.isFinite(ui)) return ui;

  const uiString = info.tokenAmount?.uiAmountString;
  if (typeof uiString === "string" && uiString.length > 0) {
    const parsed = Number(uiString);
    if (Number.isFinite(parsed)) return parsed;
  }

  const raw = info.tokenAmount?.amount;
  const decimals = info.tokenAmount?.decimals ?? 0;
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    return Number(raw) / Math.pow(10, decimals);
  }
  return 0;
}

async function getTokenAccountsByProgram(
  wallet: string,
  programId: string,
  options?: SolanaRpcCallOptions
) {
  const result = await solanaRpc<{
    value: Array<{
      pubkey: string;
      account: {
        data: { parsed?: { info?: { mint?: string; tokenAmount?: { uiAmount?: number | null; amount?: string; decimals?: number } } } };
      };
    }>;
  }>(
    "getTokenAccountsByOwner",
    [wallet, { programId }, { encoding: "jsonParsed" }],
    options
  );

  return result.value
    .map((item) => {
      const info = item.account.data.parsed?.info;
      if (!info?.mint) return null;
      return {
        mint: info.mint,
        amount: parseTokenUiAmount(info),
        decimals: info.tokenAmount?.decimals ?? 0,
        account: item.pubkey,
      };
    })
    .filter(Boolean) as Array<{ mint: string; amount: number; decimals: number; account: string }>;
}

export async function getTokenAccounts(wallet: string, options?: SolanaRpcCallOptions) {
  const [legacy, token2022] = await Promise.all([
    getTokenAccountsByProgram(wallet, SPL_TOKEN_PROGRAM, options),
    getTokenAccountsByProgram(wallet, SPL_TOKEN_2022_PROGRAM, options),
  ]);

  const byMint = new Map<string, { mint: string; amount: number; decimals: number; account: string }>();
  for (const token of [...legacy, ...token2022]) {
    const existing = byMint.get(token.mint);
    if (!existing || token.amount > existing.amount) {
      byMint.set(token.mint, token);
    }
  }

  return Array.from(byMint.values()).sort((a, b) => b.amount - a.amount);
}

export async function getMintInfo(mint: string, options?: SolanaRpcCallOptions) {
  const result = await solanaRpc<{ value: { data?: { parsed?: { info?: Record<string, unknown> } } } | null }>(
    "getAccountInfo",
    [mint, { encoding: "jsonParsed" }],
    options
  );

  const info = result.value?.data?.parsed?.info;
  if (!info) {
    return { mint, found: false };
  }

  return {
    mint,
    found: true,
    decimals: info.decimals,
    supply: info.supply,
    isInitialized: info.isInitialized,
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
  };
}
