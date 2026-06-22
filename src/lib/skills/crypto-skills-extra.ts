import { z } from "zod";
import type { SkillDefinition } from "./base";
import { getSolBalance, getTokenAccounts, getSolanaRpcOptions } from "@/lib/solana";
import { prisma } from "@/lib/prisma";

export const whaleTracker: SkillDefinition = {
  id: "whale-tracker",
  name: "Whale Tracker",
  slug: "whale-tracker",
  category: "Crypto",
  description: "Track large SOL balances and token holdings for a wallet.",
  icon: "fish",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    wallet: z.string().min(32).describe("Wallet address"),
    minSol: z.number().optional().describe("Minimum SOL to flag as whale"),
  }),
  async execute(input, ctx) {
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);
    await ctx.log("INFO", `Whale check: ${input.wallet}`, "whale-tracker");

    const balance = await getSolBalance(input.wallet, rpc);
    const tokens = await getTokenAccounts(input.wallet, rpc);
    const threshold = input.minSol ?? 1000;
    const isWhale = balance.sol >= threshold;

    return {
      wallet: input.wallet,
      solBalance: balance.sol,
      tokenCount: tokens.length,
      isWhale,
      threshold,
      topTokens: tokens.sort((a, b) => b.amount - a.amount).slice(0, 5),
      ok: true,
    };
  },
};

export const dexMonitor: SkillDefinition = {
  id: "dex-monitor",
  name: "DEX Monitor",
  slug: "dex-monitor",
  category: "Crypto",
  description: "Monitor DEX pairs via DexScreener.",
  icon: "arrow-left-right",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    mint: z.string().min(32).describe("Token mint address"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `DEX lookup: ${input.mint}`, "dex-monitor");
    const url = `https://api.dexscreener.com/latest/dex/tokens/${input.mint}`;
    const data = (await fetch(url).then((r) => r.json())) as {
      pairs?: Array<{
        chainId: string;
        dexId: string;
        pairAddress: string;
        priceUsd?: string;
        volume?: { h24?: number };
        liquidity?: { usd?: number };
      }>;
    };
    const pairs = (data.pairs ?? []).slice(0, 10);
    return { mint: input.mint, pairCount: pairs.length, pairs, ok: pairs.length > 0 };
  },
};

export const newTokenMonitor: SkillDefinition = {
  id: "new-token-monitor",
  name: "New Token Monitor",
  slug: "new-token-monitor",
  category: "Crypto",
  description: "Fetch recently boosted tokens from DexScreener.",
  icon: "sparkles",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    chain: z.string().optional().describe("Chain id e.g. solana"),
    limit: z.number().min(1).max(20).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Fetching new token profiles", "new-token-monitor");
    const url = "https://api.dexscreener.com/token-boosts/latest/v1";
    const data = (await fetch(url).then((r) => r.json())) as Array<{
      chainId: string;
      tokenAddress: string;
      description?: string;
    }>;
    const chain = (input.chain || "solana").toLowerCase();
    const tokens = data.filter((t) => t.chainId === chain).slice(0, input.limit ?? 10);
    return { chain, tokens, count: tokens.length, ok: true };
  },
};

export const portfolioTracker: SkillDefinition = {
  id: "portfolio-tracker",
  name: "Portfolio Tracker",
  slug: "portfolio-tracker",
  category: "Crypto",
  description: "Track SOL balances across multiple wallets.",
  icon: "pie-chart",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    wallets: z.array(z.string()).min(1).max(10).describe("Wallet addresses"),
  }),
  async execute(input, ctx) {
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);
    await ctx.log("INFO", `Portfolio: ${input.wallets.length} wallets`, "portfolio-tracker");

    const holdings = await Promise.all(
      input.wallets.map(async (wallet: string) => {
        try {
          const { sol } = await getSolBalance(wallet, rpc);
          return { wallet, sol, ok: true };
        } catch (error) {
          return {
            wallet,
            sol: 0,
            ok: false,
            error: error instanceof Error ? error.message : "failed",
          };
        }
      })
    );

    const totalSol = holdings.reduce((sum, h) => sum + h.sol, 0);
    return { holdings, totalSol, walletCount: input.wallets.length, ok: true };
  },
};
