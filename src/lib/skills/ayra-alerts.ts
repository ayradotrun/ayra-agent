import { z } from "zod";
import type { SkillDefinition } from "./base";
import {
  analyzeMemeToken,
  scanMemeCoins,
  type MemeQualityFilters,
} from "@/lib/agent/meme-quality";

/** AYRA scan skills */

const filterSchema = z.object({
  minMarketCapUsd: z.number().min(0).optional(),
  minVolume24hUsd: z.number().min(0).optional(),
  minLiquidityUsd: z.number().min(0).optional(),
  minHolders: z.number().min(0).optional(),
  maxTop10HolderPct: z.number().min(0).max(100).optional(),
  maxRugScore: z.number().min(0).max(100).optional(),
  minPairAgeMinutes: z.number().min(0).optional(),
  maxPairAgeMinutes: z.number().min(0).optional(),
});

export const memeCoinScanner: SkillDefinition = {
  id: "meme-coin-scanner",
  name: "AYRA Scan",
  slug: "meme-coin-scanner",
  category: "Crypto",
  description:
    "AYRA scan: find trending Solana meme coins that pass quality filters (MCAP, volume, liquidity, holders, top-10 concentration, rug score, pair age).",
  icon: "leaf",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    limit: z.number().min(1).max(15).optional().describe("Max tokens to return (default 8)"),
    source: z.enum(["top", "latest"]).optional().describe("top = trending boosts, latest = newest"),
    minMarketCapUsd: z.number().optional(),
    minVolume24hUsd: z.number().optional(),
    minLiquidityUsd: z.number().optional(),
    minHolders: z.number().optional(),
    maxTop10HolderPct: z.number().optional(),
    maxRugScore: z.number().optional(),
    maxPairAgeHours: z.number().optional().describe("Only pairs younger than N hours"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "AYRA scan", "meme-coin-scanner");
    const filters: MemeQualityFilters = {
      minMarketCapUsd: input.minMarketCapUsd,
      minVolume24hUsd: input.minVolume24hUsd,
      minLiquidityUsd: input.minLiquidityUsd,
      minHolders: input.minHolders,
      maxTop10HolderPct: input.maxTop10HolderPct,
      maxRugScore: input.maxRugScore,
      maxPairAgeMinutes: input.maxPairAgeHours != null ? input.maxPairAgeHours * 60 : undefined,
    };
    try {
      const result = await scanMemeCoins({
        limit: input.limit ?? 8,
        source: input.source ?? "top",
        filters,
      });
      return { ok: true, ...result, source: "AYRA scan / DexScreener + Jupiter + Rugcheck" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scan failed";
      return { ok: false, error: message };
    }
  },
};

export const tokenQualityReport: SkillDefinition = {
  id: "token-quality-report",
  name: "AYRA Quality Report",
  slug: "token-quality-report",
  category: "Crypto",
  description:
    "AYRA quality report for one Solana mint: MCAP, volume, holders, top-10 concentration, pair age, rug score, pass/fail filters.",
  icon: "shield",
  permission: "network",
  isEnabled: true,
  inputSchema: filterSchema
    .extend({
      mint: z.string().min(32).max(50).describe("Solana token mint / CA address"),
      maxPairAgeHours: z.number().optional().describe("Only pairs younger than N hours"),
    })
    .partial()
    .required({ mint: true }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Quality report: ${input.mint}`, "token-quality-report");
    const { mint, maxPairAgeHours, ...rest } = input;
    const filters: MemeQualityFilters = {
      ...rest,
      maxPairAgeMinutes: maxPairAgeHours != null ? maxPairAgeHours * 60 : rest.maxPairAgeMinutes,
    };
    try {
      const snapshot = await analyzeMemeToken(mint, filters);
      return { ok: true, ...snapshot, source: "AYRA quality / DexScreener + Jupiter + Rugcheck" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report failed";
      return { ok: false, mint, error: message };
    }
  },
};

export const AYRA_ALERT_SKILLS: SkillDefinition[] = [memeCoinScanner, tokenQualityReport];
