import { z } from "zod";
import type { SkillDefinition } from "./base";
import { prisma } from "@/lib/prisma";
import { getMintInfo, getSolanaRpcOptions } from "@/lib/solana";

export const tokenPriceTracker: SkillDefinition = {
  id: "token-price-tracker",
  name: "Token Price Tracker",
  slug: "token-price-tracker",
  category: "Crypto",
  description: "Check live token price, volume, and liquidity from DEX data.",
  icon: "trending-up",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    mint: z.string().min(32).max(50).describe("Solana token mint address"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Price check: ${input.mint}`, "token-price-tracker");

    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);

    let onChain: Record<string, unknown> = {};
    try {
      onChain = await getMintInfo(input.mint, rpc);
    } catch {
      onChain = { found: false };
    }

    const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${input.mint}`;
    const dexRes = await fetch(dexUrl);
    const dexData = (await dexRes.json()) as {
      pairs?: Array<{
        chainId: string;
        dexId: string;
        url: string;
        baseToken?: { name?: string; symbol?: string };
        priceUsd?: string;
        priceNative?: string;
        volume?: { h24?: number; h6?: number; h1?: number };
        liquidity?: { usd?: number };
        priceChange?: { h24?: number; h6?: number; h1?: number };
        marketCap?: number;
        fdv?: number;
      }>;
    };

    const solanaPairs = (dexData.pairs ?? []).filter((p) => p.chainId === "solana");
    const best = solanaPairs.sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
    )[0];

    return {
      mint: input.mint,
      name: best?.baseToken?.name ?? null,
      symbol: best?.baseToken?.symbol ?? null,
      priceUsd: best?.priceUsd ? parseFloat(best.priceUsd) : null,
      priceSol: best?.priceNative ? parseFloat(best.priceNative) : null,
      volume24h: best?.volume?.h24 ?? null,
      liquidityUsd: best?.liquidity?.usd ?? null,
      change24h: best?.priceChange?.h24 ?? null,
      marketCap: best?.marketCap ?? null,
      fdv: best?.fdv ?? null,
      dex: best?.dexId ?? null,
      dexUrl: best?.url ?? null,
      ayraUrl: `https://ayra.run/token/${input.mint}`,
      pairCount: solanaPairs.length,
      onChain,
      ok: !!best || !!(onChain as { found?: boolean }).found,
      note: "Prices from DexScreener. Not financial advice.",
    };
  },
};
