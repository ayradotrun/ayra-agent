import { getWalletBalances } from "@/lib/helius/wallet-analyzer";

export interface TokenHolding {
  mint: string;
  amount: number;
  decimals: number;
  account: string;
  symbol?: string;
  name?: string;
}

async function fetchDexScreenerTokenMeta(
  mints: string[]
): Promise<Map<string, { symbol?: string; name?: string }>> {
  const meta = new Map<string, { symbol?: string; name?: string }>();
  if (mints.length === 0) return meta;

  const unique = Array.from(new Set(mints));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 30) {
    chunks.push(unique.slice(i, i + 30));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) return;

        const data = (await res.json()) as {
          pairs?: Array<{
            chainId?: string;
            baseToken?: { address?: string; symbol?: string; name?: string };
            liquidity?: { usd?: number };
          }>;
        };

        const bestByMint = new Map<string, { symbol?: string; name?: string; liq: number }>();
        for (const pair of data.pairs ?? []) {
          if (pair.chainId !== "solana") continue;
          const mint = pair.baseToken?.address;
          if (!mint) continue;
          const liq = pair.liquidity?.usd ?? 0;
          const prev = bestByMint.get(mint);
          if (!prev || liq > prev.liq) {
            bestByMint.set(mint, {
              symbol: pair.baseToken?.symbol,
              name: pair.baseToken?.name,
              liq,
            });
          }
        }

        for (const [mint, info] of Array.from(bestByMint.entries())) {
          meta.set(mint, { symbol: info.symbol, name: info.name });
        }
      } catch {
        /* ignore chunk failures */
      }
    })
  );

  return meta;
}

export async function enrichTokenHoldings(
  tokens: TokenHolding[],
  options?: { heliusKey?: string; wallet?: string }
): Promise<TokenHolding[]> {
  if (tokens.length === 0) return tokens;

  const metaByMint = new Map<string, { symbol?: string; name?: string }>();

  if (options?.heliusKey && options?.wallet) {
    try {
      const heliusBalances = await getWalletBalances(options.wallet, options.heliusKey);
      for (const balance of heliusBalances?.balances ?? []) {
        if (!balance.mint) continue;
        if (balance.symbol || balance.name) {
          metaByMint.set(balance.mint, {
            symbol: balance.symbol ?? undefined,
            name: balance.name ?? undefined,
          });
        }
      }
    } catch {
      /* Helius metadata optional */
    }
  }

  const missingMeta = tokens
    .filter((t) => !t.symbol && !t.name && !metaByMint.has(t.mint))
    .map((t) => t.mint);

  if (missingMeta.length > 0) {
    const dexMeta = await fetchDexScreenerTokenMeta(missingMeta);
    for (const [mint, info] of Array.from(dexMeta.entries())) {
      if (!metaByMint.has(mint)) metaByMint.set(mint, info);
    }
  }

  return tokens.map((token) => {
    const meta = metaByMint.get(token.mint);
    return {
      ...token,
      symbol: token.symbol || meta?.symbol,
      name: token.name || meta?.name,
    };
  });
}

export function formatTokenHoldingLabel(token: {
  symbol?: string;
  name?: string;
  mint?: string;
}): string {
  const symbol = token.symbol?.trim();
  const name = token.name?.trim();

  if (name && symbol && name.toLowerCase() !== symbol.toLowerCase()) {
    return `${name} (${symbol})`;
  }
  if (symbol) return symbol;
  if (name) return name;

  const mint = token.mint?.trim();
  if (mint && mint.length > 12) {
    return `${mint.slice(0, 6)}…${mint.slice(-4)}`;
  }
  return mint || "Unknown token";
}

export function formatTokenHoldingAmount(amount: number, decimals?: number): string {
  if (!Number.isFinite(amount)) return "?";

  const maxFraction =
    typeof decimals === "number" && decimals >= 0 ? Math.min(decimals, 6) : 4;

  if (amount >= 1_000_000) {
    return amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (amount >= 1) {
    return amount.toLocaleString("en-US", {
      maximumFractionDigits: maxFraction,
      minimumFractionDigits: 0,
    });
  }
  if (amount >= 0.0001) {
    return amount.toLocaleString("en-US", {
      maximumFractionDigits: Math.min(6, maxFraction),
      minimumFractionDigits: 0,
    });
  }

  return amount.toLocaleString("en-US", {
    maximumFractionDigits: 8,
    minimumFractionDigits: 0,
  });
}
