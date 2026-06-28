import { decryptSafe } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getDecryptedSecret } from "@/lib/secrets/secret-store";
import { extractRpcApiKeyFromUrl } from "@/lib/solana";

const BASE_URL = "https://api.helius.xyz/v1";

const HELIUS_KEY_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Helius dashboard keys are UUIDs; reject encrypted blobs mistaken as keys after failed decrypt. */
function normalizeHeliusApiKey(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  if (key.startsWith("plain:")) key = key.slice("plain:".length).trim();
  if (!key) return undefined;

  if (HELIUS_KEY_UUID.test(key)) return key;
  if (/^[0-9a-f]{32,64}$/i.test(key)) return key;

  // decryptSafe() returns ciphertext on failure — never send that to Helius
  if (/^[A-Za-z0-9+/]{48,}={0,2}$/.test(key)) return undefined;

  return key.length >= 20 && key.length <= 128 ? key : undefined;
}

async function resolveUserHeliusApiKey(userId: string): Promise<string | undefined> {
  const fromSecret = normalizeHeliusApiKey(
    await getDecryptedSecret(userId, "solana", "rpc_api_key")
  );
  if (fromSecret) return fromSecret;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { solanaRpcApiKey: true, solanaDefaultRpc: true },
  });
  if (!user) return undefined;

  const fromLegacy = normalizeHeliusApiKey(
    user.solanaRpcApiKey ? decryptSafe(user.solanaRpcApiKey) : undefined
  );
  if (fromLegacy) return fromLegacy;

  const rpcUrl = user.solanaDefaultRpc?.trim();
  if (rpcUrl) return normalizeHeliusApiKey(extractRpcApiKeyFromUrl(rpcUrl));

  return undefined;
}

export interface HeliusTokenBalance {
  mint: string;
  symbol?: string | null;
  name?: string | null;
  balance: number;
  decimals: number;
}

export interface HeliusBalancesResponse {
  balances?: HeliusTokenBalance[];
  pagination?: { hasMore?: boolean };
}

const SOL_MINT = "So11111111111111111111111111111111111111112";

export interface HeliusFundingSource {
  funder: string;
  funderName?: string;
  funderType?: string;
  amount?: number;
  timestamp?: number;
  signature?: string;
}

export interface HeliusIdentity {
  name?: string;
  category?: string;
  type?: string;
}

export interface HeliusTransfer {
  mint?: string;
  direction?: string;
  counterparty?: string;
  timestamp?: number;
  signature?: string;
}

/** Server or legacy fallback — may use HELIUS_API_KEY / SOLANA_RPC_API_KEY from .env */
export async function resolveHeliusApiKey(userId?: string): Promise<string | undefined> {
  if (userId) {
    const userKey = await resolveUserHeliusApiKey(userId);
    if (userKey) return userKey;
  }

  const envKey = process.env.HELIUS_API_KEY?.trim();
  if (envKey) return envKey;

  return process.env.SOLANA_RPC_API_KEY?.trim() || undefined;
}

async function heliusGet<T>(path: string, apiKey: string): Promise<T | null> {
  const url = `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}api-key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Api-Key": apiKey,
    },
  });
  if (res.status === 404) return null;
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Helius rejected your API key (401). In Settings → Solana, paste the key from dashboard.helius.dev (RPC API Key), or use a full Helius RPC URL with ?api-key=…"
    );
  }
  if (!res.ok) {
    throw new Error(`Helius API ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getFundingSource(
  walletAddress: string,
  apiKey: string
): Promise<HeliusFundingSource | null> {
  return heliusGet<HeliusFundingSource>(`/wallet/${walletAddress}/funded-by`, apiKey);
}

export async function getWalletBalances(
  walletAddress: string,
  apiKey: string
): Promise<HeliusBalancesResponse | null> {
  return heliusGet<HeliusBalancesResponse>(
    `/wallet/${walletAddress}/balances?limit=100&showNative=true&showZeroBalance=false`,
    apiKey
  );
}

export async function enrichFundingSource(
  funding: HeliusFundingSource,
  apiKey: string
): Promise<HeliusFundingSource> {
  if (!funding.funder) return funding;
  if (funding.funderName && funding.funderType) return funding;

  const identity = await getWalletIdentity(funding.funder, apiKey);
  if (!identity) return funding;

  const category = identity.category?.toLowerCase() ?? "";
  const inferredType =
    identity.type ||
    (category.includes("exchange") ? "exchange" : undefined) ||
    (category.includes("defi") ? "defi-protocol" : undefined);

  return {
    ...funding,
    funderName: funding.funderName || identity.name,
    funderType: funding.funderType || inferredType,
  };
}

export function balancesFromHelius(response: HeliusBalancesResponse | null): {
  sol: number;
  lamports: number;
  tokens: Array<{ mint: string; amount: number; decimals: number; symbol?: string; name?: string; account: string }>;
} {
  const balances = response?.balances ?? [];
  const solEntry = balances.find((b) => b.mint === SOL_MINT || b.symbol === "SOL");
  const sol = solEntry?.balance ?? 0;
  const tokens = balances
    .filter((b) => b.mint !== SOL_MINT && b.balance > 0)
    .map((b) => ({
      mint: b.mint,
      amount: b.balance,
      decimals: b.decimals,
      symbol: b.symbol ?? undefined,
      name: b.name ?? undefined,
      account: "",
    }));

  return {
    sol,
    lamports: Math.round(sol * 1_000_000_000),
    tokens,
  };
}

export async function getWalletIdentity(
  walletAddress: string,
  apiKey: string
): Promise<HeliusIdentity | null> {
  return heliusGet<HeliusIdentity>(`/wallet/${walletAddress}/identity`, apiKey);
}

export async function checkFundBundled(
  funding: HeliusFundingSource | null,
  apiKey: string
): Promise<boolean> {
  if (!funding) return false;
  if (funding.funderType === "exchange" || funding.funderName) return false;

  const funderAddress = funding.funder;
  const fundingTimestamp = funding.timestamp;
  if (!funderAddress || !fundingTimestamp) return false;

  const history = await heliusGet<{ data?: Array<{ timestamp?: number }> }>(
    `/wallet/${funderAddress}/history?limit=100`,
    apiKey
  );
  const transactions = history?.data ?? [];
  if (transactions.length === 0) return false;

  const timeWindow = 600;
  const relevantTxs = transactions.filter(
    (tx) => tx.timestamp != null && Math.abs(tx.timestamp - fundingTimestamp) <= timeWindow
  );
  return relevantTxs.length > 5;
}

export async function getTokenTransfers(
  walletAddress: string,
  apiKey: string,
  mint?: string
): Promise<HeliusTransfer[]> {
  const data = await heliusGet<{ data?: HeliusTransfer[] }>(
    `/wallet/${walletAddress}/transfers?limit=100`,
    apiKey
  );
  const all = data?.data ?? [];
  if (!mint) return all;
  return all.filter((t) => t.mint === mint);
}

export async function checkTokenBundled(
  transfers: HeliusTransfer[],
  mint: string,
  apiKey: string
): Promise<{ isBundled: boolean; distributor?: string; recipientCount?: number }> {
  if (!transfers.length) return { isBundled: false };

  const incoming = transfers.filter((t) => t.direction === "in" && t.mint === mint);
  const toAnalyze = incoming.slice(0, 5);

  for (const transfer of toAnalyze) {
    const counterparty = transfer.counterparty;
    if (!counterparty || transfer.timestamp == null) continue;

    await sleep(400);
    const identity = await getWalletIdentity(counterparty, apiKey);
    if (
      identity &&
      (identity.type === "exchange" ||
        (identity.category &&
          (identity.category.includes("DeFi") || identity.category.includes("Swap"))))
    ) {
      continue;
    }

    await sleep(400);
    const senderTransfers = await getTokenTransfers(counterparty, apiKey, mint);
    const senderOutgoing = senderTransfers.filter((t) => t.direction === "out" && t.mint === mint);
    const timeWindow = 600;
    const relevant = senderOutgoing.filter(
      (t) => t.timestamp != null && Math.abs(t.timestamp - transfer.timestamp!) <= timeWindow
    );
    const recipients = new Set(relevant.map((t) => t.counterparty).filter(Boolean));
    if (recipients.size > 5) {
      return { isBundled: true, distributor: counterparty, recipientCount: recipients.size };
    }
  }

  return { isBundled: false };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** User Settings → Solana only (never server .env). */
export async function getHeliusApiKeyForUser(userId: string): Promise<string | undefined> {
  return resolveUserHeliusApiKey(userId);
}

/** Whether user has Helius-capable key or RPC in Settings. */
export async function hasHeliusAccess(userId: string): Promise<boolean> {
  const key = await resolveUserHeliusApiKey(userId);
  if (key) return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { solanaDefaultRpc: true },
  });
  return user?.solanaDefaultRpc?.toLowerCase().includes("helius") ?? false;
}
