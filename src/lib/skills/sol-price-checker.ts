import { z } from "zod";
import type { SkillDefinition } from "./base";

interface CoinGeckoPrice {
  solana?: {
    usd?: number;
    usd_24h_change?: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
  };
}

export const solPriceChecker: SkillDefinition = {
  id: "sol-price-checker",
  name: "SOL Price Checker",
  slug: "sol-price-checker",
  category: "Crypto",
  description:
    "Get live SOL (Solana native coin) price in USD with 24h change. Use when user asks for SOL price or solana price.",
  icon: "coins",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    await ctx.log("INFO", "Fetching SOL price", "sol-price-checker");

    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true";

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API ${response.status}`);
    }

    const data = (await response.json()) as CoinGeckoPrice;
    const sol = data.solana;

    if (!sol?.usd) {
      return { ok: false, error: "Could not fetch SOL price" };
    }

    return {
      ok: true,
      symbol: "SOL",
      name: "Solana",
      priceUsd: sol.usd,
      change24h: sol.usd_24h_change ?? null,
      marketCapUsd: sol.usd_market_cap ?? null,
      volume24hUsd: sol.usd_24h_vol ?? null,
      source: "CoinGecko",
      note: "Not financial advice.",
    };
  },
};
