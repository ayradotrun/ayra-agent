/** Shared token lookup + Telegram card formatting (paste CA or ticker). */

export interface TokenCardData {
  ok: boolean;
  mint?: string | null;
  symbol?: string | null;
  name?: string | null;
  priceUsd?: number | null;
  change24h?: number | null;
  liquidityUsd?: number | null;
  marketCap?: number | null;
  volume24h?: number | null;
  dexUrl?: string | null;
  riskScoreNormalised?: number | null;
  verdict?: string | null;
  lpLockedPct?: number | null;
  riskCount?: number;
  error?: string;
  query?: string;
}

const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,50}$/;

function formatUsd(value: number | null | undefined, digits = 6): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1) {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function verdictEmoji(verdict: string | null | undefined): string {
  if (!verdict) return "❓";
  if (verdict.includes("safe")) return "✅";
  if (verdict.includes("low")) return "🟢";
  if (verdict.includes("medium")) return "🟡";
  if (verdict.includes("high")) return "🔴";
  return "❓";
}

export function isSolanaMint(value: string): boolean {
  return MINT_REGEX.test(value.trim());
}

/** Resolve ticker → mint via Jupiter token search (curated), fallback DexScreener */
export async function resolveTickerToMint(ticker: string): Promise<{
  mint: string;
  symbol: string | null;
  name: string | null;
} | null> {
  const query = ticker.trim();

  // Jupiter curated token list — avoids fake tickers with inflated liquidity
  try {
    const jupRes = await fetch(
      `https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } }
    );
    if (jupRes.ok) {
      const tokens = (await jupRes.json()) as Array<{
        id?: string;
        symbol?: string;
        name?: string;
        mcap?: number;
        holderCount?: number;
      }>;
      const queryUpper = query.toUpperCase();
      const exact = tokens.filter((t) => t.symbol?.toUpperCase() === queryUpper && t.id);
      const pool = exact.length > 0 ? exact : tokens.filter((t) => t.id);
      const best = pool.sort(
        (a, b) => (b.mcap ?? b.holderCount ?? 0) - (a.mcap ?? a.holderCount ?? 0)
      )[0];
      if (best?.id) {
        return { mint: best.id, symbol: best.symbol ?? null, name: best.name ?? null };
      }
    }
  } catch {
    // fall through to DexScreener
  }

  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    pairs?: Array<{
      chainId: string;
      baseToken?: { address?: string; name?: string; symbol?: string };
      liquidity?: { usd?: number };
      marketCap?: number;
    }>;
  };

  const queryUpper = query.toUpperCase();
  const solPairs = (data.pairs ?? []).filter((p) => p.chainId === "solana" && p.baseToken?.address);
  const exact = solPairs.filter((p) => p.baseToken?.symbol?.toUpperCase() === queryUpper);
  const pool = exact.length > 0 ? exact : solPairs;
  // Prefer highest market cap over raw liquidity (scam pools inflate liquidity)
  const best = pool.sort((a, b) => (b.marketCap ?? b.liquidity?.usd ?? 0) - (a.marketCap ?? a.liquidity?.usd ?? 0))[0];
  if (!best?.baseToken?.address) return null;

  return {
    mint: best.baseToken.address,
    symbol: best.baseToken.symbol ?? null,
    name: best.baseToken.name ?? null,
  };
}

/** Full token lookup by mint address (DexScreener + Jupiter + Rugcheck) */
export async function lookupTokenByMint(mint: string): Promise<TokenCardData> {
  const [dexRes, jupRes, rugRes] = await Promise.all([
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      headers: { Accept: "application/json" },
    }),
    fetch(`https://lite-api.jup.ag/price/v3?ids=${encodeURIComponent(mint)}`, {
      headers: { Accept: "application/json" },
    }),
    fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`, {
      headers: { Accept: "application/json" },
    }),
  ]);

  const dexData = dexRes.ok
    ? ((await dexRes.json()) as {
        pairs?: Array<{
          chainId: string;
          url?: string;
          baseToken?: { name?: string; symbol?: string };
          priceUsd?: string;
          volume?: { h24?: number };
          liquidity?: { usd?: number };
          priceChange?: { h24?: number };
          marketCap?: number;
        }>;
      })
    : { pairs: [] };

  const jupData = jupRes.ok
    ? ((await jupRes.json()) as Record<string, { usdPrice?: number; priceChange24h?: number }>)
    : {};

  const rugData = rugRes.ok
    ? ((await rugRes.json()) as {
        score_normalised?: number;
        lpLockedPct?: number;
        risks?: unknown[];
      })
    : null;

  const solPairs = (dexData.pairs ?? []).filter((p) => p.chainId === "solana");
  const best = solPairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  const jup = jupData[mint];

  const priceUsd = jup?.usdPrice ?? (best?.priceUsd ? parseFloat(best.priceUsd) : null);
  const change24h = jup?.priceChange24h ?? best?.priceChange?.h24 ?? null;

  const normalised = rugData?.score_normalised ?? null;
  const verdict =
    normalised == null
      ? null
      : normalised <= 1
        ? "looks safe"
        : normalised <= 30
          ? "low risk"
          : normalised <= 60
            ? "medium risk"
            : "high risk";

  if (!priceUsd && !best) {
    return { ok: false, mint, error: "Token not found or has no liquidity yet" };
  }

  return {
    ok: true,
    mint,
    symbol: best?.baseToken?.symbol ?? null,
    name: best?.baseToken?.name ?? null,
    priceUsd,
    change24h,
    liquidityUsd: best?.liquidity?.usd ?? null,
    marketCap: best?.marketCap ?? null,
    volume24h: best?.volume?.h24 ?? null,
    dexUrl: best?.url ?? `https://dexscreener.com/solana/${mint}`,
    riskScoreNormalised: normalised,
    verdict,
    lpLockedPct: rugData?.lpLockedPct ?? null,
    riskCount: rugData?.risks?.length ?? 0,
  };
}

/** Lookup by mint address or ticker symbol */
export async function lookupToken(query: string): Promise<TokenCardData> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: false, error: "Empty query" };

  if (isSolanaMint(trimmed)) {
    return lookupTokenByMint(trimmed);
  }

  const resolved = await resolveTickerToMint(trimmed);
  if (!resolved) {
    return { ok: false, query: trimmed, error: `Token "${trimmed}" not found on Solana` };
  }

  const card = await lookupTokenByMint(resolved.mint);
  return { ...card, query: trimmed, symbol: card.symbol ?? resolved.symbol, name: card.name ?? resolved.name };
}

export function formatTokenCard(data: TokenCardData): string {
  if (!data.ok) {
    return `❌ ${data.error || "Token lookup failed"}${data.query ? ` (${data.query})` : ""}`;
  }

  const sym = data.symbol || data.name || "Token";
  const lines = [`💰 *${sym}*${data.name && data.symbol ? ` (${data.name})` : ""}`];

  if (typeof data.priceUsd === "number") {
    lines.push(`Price: *${formatUsd(data.priceUsd)}*`);
  }
  if (typeof data.change24h === "number") {
    lines.push(`24h: ${formatPct(data.change24h)}`);
  }
  if (typeof data.liquidityUsd === "number") {
    lines.push(`Liquidity: ${formatUsd(data.liquidityUsd, 0)}`);
  }
  if (typeof data.marketCap === "number" && data.marketCap > 0 && data.marketCap < 500_000_000_000) {
    lines.push(`Market cap: ${formatUsd(data.marketCap, 0)}`);
  }
  if (typeof data.volume24h === "number") {
    lines.push(`Volume 24h: ${formatUsd(data.volume24h, 0)}`);
  }

  if (data.verdict != null) {
    lines.push(
      `${verdictEmoji(data.verdict)} Safety: *${data.verdict}* (${data.riskScoreNormalised ?? "?"}% risk)`
    );
    if (typeof data.lpLockedPct === "number" && data.lpLockedPct > 0) {
      lines.push(`LP locked: ${data.lpLockedPct}%`);
    }
  }

  if (data.mint) {
    lines.push(`\nCA: \`${data.mint}\``);
  }
  if (data.dexUrl) {
    lines.push(`[DexScreener](${data.dexUrl})`);
  }
  lines.push("_Not financial advice. DYOR._");

  return lines.join("\n");
}

/** Extract ticker from "price bonk" style messages (supports common price-query aliases) */
export function extractTickerFromMessage(text: string): string | null {
  const trimmed = text.trim();
  const patterns = [
    /^(?:harga|price|cek|check|berapa|brp|kurs|nilai)\s+([a-z0-9]{2,20})$/i,
    /^([a-z0-9]{2,20})\s+(?:harga|price)$/i,
    /^(?:harga|price|cek|check|berapa|brp)\s+([a-z0-9]{2,20})\b/i,
  ];

  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m?.[1]) {
      const ticker = m[1].toLowerCase();
      if (!["sol", "solana", "tps", "network"].includes(ticker)) return m[1];
    }
  }
  return null;
}
