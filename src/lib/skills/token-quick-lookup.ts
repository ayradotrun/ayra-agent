import { z } from "zod";
import type { SkillDefinition } from "./base";
import { lookupToken } from "@/lib/agent/token-card";
import { passesDumpFilter } from "@/lib/agent/meme-quality";

export const tokenQuickLookup: SkillDefinition = {
  id: "token-quick-lookup",
  name: "Token Quick Lookup",
  slug: "token-quick-lookup",
  category: "Crypto",
  description:
    "Instant token info: paste a Solana CA/mint address OR type a ticker (BONK, WIF). Returns price, 24h change, liquidity, market cap, and rugcheck safety score.",
  icon: "zap",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(60)
      .describe("Token ticker (e.g. BONK) or Solana mint/CA address"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Quick lookup: ${input.query}`, "token-quick-lookup");
    const result = await lookupToken(input.query);
    return { ...result, ok: result.ok };
  },
};

export const trendingTokens: SkillDefinition = {
  id: "trending-tokens",
  name: "Trending Tokens",
  slug: "trending-tokens",
  category: "Crypto",
  description:
    "Get top trending Solana tokens on DexScreener right now. No input needed.",
  icon: "flame",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    limit: z.number().min(3).max(15).optional().describe("Number of tokens (default 10)"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Fetching trending Solana tokens", "trending-tokens");
    const limit = input.limit ?? 10;

    const res = await fetch("https://api.dexscreener.com/token-boosts/top/v1", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { ok: false, error: `DexScreener API ${res.status}` };

    const boosts = (await res.json()) as Array<{
      chainId: string;
      tokenAddress?: string;
      description?: string;
      url?: string;
    }>;

    const solana = boosts.filter((b) => b.chainId === "solana" && b.tokenAddress).slice(0, limit * 4);

    const tokensRaw = await Promise.all(
      solana.map(async (b) => {
        const mint = b.tokenAddress!;
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (!dexRes.ok) return { mint, description: b.description, url: b.url };

        const dexData = (await dexRes.json()) as {
          pairs?: Array<{
            baseToken?: { symbol?: string; name?: string };
            priceUsd?: string;
            priceChange?: { h24?: number };
            liquidity?: { usd?: number };
            marketCap?: number;
            fdv?: number;
            url?: string;
          }>;
        };
        const best = (dexData.pairs ?? [])
          .filter((p) => p)
          .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

        return {
          mint,
          symbol: best?.baseToken?.symbol ?? null,
          name: best?.baseToken?.name ?? null,
          priceUsd: best?.priceUsd ? parseFloat(best.priceUsd) : null,
          change24h: best?.priceChange?.h24 ?? null,
          liquidityUsd: best?.liquidity?.usd ?? null,
          marketCap: best?.marketCap ?? best?.fdv ?? null,
          url: best?.url ?? b.url,
          description: b.description,
        };
      })
    );

    const tokens = tokensRaw
      .filter((t) => passesDumpFilter(t.change24h))
      .slice(0, limit);

    return { ok: true, tokens, count: tokens.length, source: "DexScreener" };
  },
};
