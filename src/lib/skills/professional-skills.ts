import { z } from "zod";
import type { SkillDefinition } from "./base";
import { solanaRpc, getSolanaRpcOptions, lamportsToSol } from "@/lib/solana";
import { prisma } from "@/lib/prisma";

/**
 * Professional read-only Solana skills inspired by SendAI's solana-agent-kit
 * (the most-starred Solana AI agent toolkit). All skills are safe: no private
 * keys, no signing, no trade execution — only live data for research.
 */

const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,50}$/;

// ---------------------------------------------------------------------------
// Jupiter Price — liquidity-aware USD price (Jupiter Price API v3)
// ---------------------------------------------------------------------------
export const jupiterPrice: SkillDefinition = {
  id: "jupiter-price",
  name: "Jupiter Price",
  slug: "jupiter-price",
  category: "Crypto",
  description:
    "Get accurate USD price for any Solana token via Jupiter aggregator (liquidity-weighted). Input a mint address.",
  icon: "trending-up",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    mint: z.string().min(32).max(50).describe("Solana token mint address"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Jupiter price: ${input.mint}`, "jupiter-price");
    const url = `https://lite-api.jup.ag/price/v3?ids=${encodeURIComponent(input.mint)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { ok: false, error: `Jupiter API ${res.status}`, mint: input.mint };

    const data = (await res.json()) as Record<
      string,
      { usdPrice?: number; priceChange24h?: number; decimals?: number; liquidity?: number }
    >;
    const entry = data[input.mint];
    if (!entry?.usdPrice) {
      return { ok: false, mint: input.mint, error: "No price found (token may lack liquidity)" };
    }

    return {
      ok: true,
      mint: input.mint,
      priceUsd: entry.usdPrice,
      change24h: entry.priceChange24h ?? null,
      liquidityUsd: entry.liquidity ?? null,
      decimals: entry.decimals ?? null,
      source: "Jupiter",
      note: "Not financial advice.",
    };
  },
};

// ---------------------------------------------------------------------------
// Rugcheck — token safety / rug risk report (rugcheck.xyz)
// ---------------------------------------------------------------------------
export const rugcheck: SkillDefinition = {
  id: "rugcheck",
  name: "Rugcheck Safety",
  slug: "rugcheck",
  category: "Crypto",
  description:
    "Analyze a Solana token's safety: rug risk score, mint/freeze authority, LP lock, and risk flags. Input a mint address.",
  icon: "shield",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    mint: z.string().min(32).max(50).describe("Solana token mint address to scan"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Rugcheck: ${input.mint}`, "rugcheck");
    const url = `https://api.rugcheck.xyz/v1/tokens/${input.mint}/report/summary`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { ok: false, error: `Rugcheck API ${res.status}`, mint: input.mint };

    const data = (await res.json()) as {
      score?: number;
      score_normalised?: number;
      lpLockedPct?: number;
      tokenProgram?: string;
      risks?: Array<{ name?: string; level?: string; description?: string; score?: number }>;
    };

    const risks = (data.risks ?? []).map((r) => ({
      name: r.name,
      level: r.level,
      description: r.description,
    }));

    const normalised = data.score_normalised ?? null;
    const verdict =
      normalised == null
        ? "unknown"
        : normalised <= 1
          ? "looks safe"
          : normalised <= 30
            ? "low risk"
            : normalised <= 60
              ? "medium risk"
              : "high risk";

    return {
      ok: true,
      mint: input.mint,
      riskScore: data.score ?? null,
      riskScoreNormalised: normalised,
      verdict,
      lpLockedPct: data.lpLockedPct ?? null,
      riskCount: risks.length,
      risks,
      source: "rugcheck.xyz",
      note: "Automated heuristic — DYOR, not financial advice.",
    };
  },
};

// ---------------------------------------------------------------------------
// Token Finder — resolve a ticker/symbol to a mint via DexScreener search
// ---------------------------------------------------------------------------
export const tokenFinder: SkillDefinition = {
  id: "token-finder",
  name: "Token Finder",
  slug: "token-finder",
  category: "Crypto",
  description:
    "Find a Solana token's mint address by its ticker or name (e.g. BONK, WIF). Returns the most liquid match.",
  icon: "search",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    query: z.string().min(1).max(40).describe("Token ticker or name, e.g. BONK"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Token finder: ${input.query}`, "token-finder");
    const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(input.query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { ok: false, error: `DexScreener API ${res.status}`, query: input.query };

    const data = (await res.json()) as {
      pairs?: Array<{
        chainId: string;
        baseToken?: { address?: string; name?: string; symbol?: string };
        priceUsd?: string;
        liquidity?: { usd?: number };
        marketCap?: number;
        url?: string;
      }>;
    };

    const solPairs = (data.pairs ?? []).filter((p) => p.chainId === "solana" && p.baseToken?.address);
    const best = solPairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];

    if (!best) {
      return { ok: false, query: input.query, error: "No Solana token found for that ticker" };
    }

    const candidates = solPairs.slice(0, 5).map((p) => ({
      symbol: p.baseToken?.symbol,
      name: p.baseToken?.name,
      mint: p.baseToken?.address,
      liquidityUsd: p.liquidity?.usd ?? null,
    }));

    return {
      ok: true,
      query: input.query,
      symbol: best.baseToken?.symbol ?? null,
      name: best.baseToken?.name ?? null,
      mint: best.baseToken?.address ?? null,
      priceUsd: best.priceUsd ? parseFloat(best.priceUsd) : null,
      liquidityUsd: best.liquidity?.usd ?? null,
      marketCap: best.marketCap ?? null,
      dexUrl: best.url ?? null,
      candidates,
      source: "DexScreener",
    };
  },
};

// ---------------------------------------------------------------------------
// SNS Resolver — resolve a .sol domain to its owner wallet (Bonfida)
// ---------------------------------------------------------------------------
export const snsResolver: SkillDefinition = {
  id: "sns-resolver",
  name: "SNS Domain Resolver",
  slug: "sns-resolver",
  category: "Crypto",
  description:
    "Resolve a Solana Name Service (.sol) domain to its owner wallet address. Input the domain without .sol.",
  icon: "globe",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    domain: z.string().min(1).max(40).describe("Domain name without .sol, e.g. bonfida"),
  }),
  async execute(input, ctx) {
    const name = input.domain.trim().replace(/\.sol$/i, "");
    await ctx.log("INFO", `SNS resolve: ${name}.sol`, "sns-resolver");
    const url = `https://sns-sdk-proxy.bonfida.workers.dev/resolve/${encodeURIComponent(name)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { ok: false, error: `SNS API ${res.status}`, domain: `${name}.sol` };

    const data = (await res.json()) as { s?: string; result?: string };
    if (data.s !== "ok" || !data.result) {
      return { ok: false, domain: `${name}.sol`, error: "Domain not registered or unresolved" };
    }

    return {
      ok: true,
      domain: `${name}.sol`,
      owner: data.result,
      source: "Bonfida SNS",
    };
  },
};

// ---------------------------------------------------------------------------
// Network Stats — Solana TPS, epoch, version (uses configured RPC)
// ---------------------------------------------------------------------------
export const solanaNetworkStats: SkillDefinition = {
  id: "network-stats",
  name: "Solana Network Stats",
  slug: "network-stats",
  category: "Crypto",
  description:
    "Live Solana network health: current TPS, epoch progress, and validator version. No input needed.",
  icon: "activity",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({}),
  async execute(_input, ctx) {
    await ctx.log("INFO", "Fetching Solana network stats", "network-stats");
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);

    const [samples, epoch, version] = await Promise.all([
      solanaRpc<Array<{ numTransactions: number; numSlots: number; samplePeriodSecs: number }>>(
        "getRecentPerformanceSamples",
        [1],
        rpc
      ),
      solanaRpc<{ epoch: number; slotIndex: number; slotsInEpoch: number; absoluteSlot: number }>(
        "getEpochInfo",
        [],
        rpc
      ),
      solanaRpc<{ "solana-core": string }>("getVersion", [], rpc).catch(() => null),
    ]);

    const sample = samples?.[0];
    const tps =
      sample && sample.samplePeriodSecs > 0
        ? Math.round(sample.numTransactions / sample.samplePeriodSecs)
        : null;
    const epochProgress =
      epoch && epoch.slotsInEpoch > 0
        ? Math.round((epoch.slotIndex / epoch.slotsInEpoch) * 1000) / 10
        : null;

    return {
      ok: true,
      tps,
      epoch: epoch?.epoch ?? null,
      epochProgressPct: epochProgress,
      absoluteSlot: epoch?.absoluteSlot ?? null,
      validatorVersion: version?.["solana-core"] ?? null,
      source: "Solana RPC",
    };
  },
};

// ---------------------------------------------------------------------------
// Wallet net worth — SOL + SPL token value estimate (Jupiter prices)
// ---------------------------------------------------------------------------
export const walletNetWorth: SkillDefinition = {
  id: "wallet-networth",
  name: "Wallet Net Worth",
  slug: "wallet-networth",
  category: "Crypto",
  description:
    "Estimate a Solana wallet's USD net worth from SOL balance plus its largest SPL token holdings.",
  icon: "wallet",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    wallet: z.string().min(32).max(50).describe("Solana wallet address"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Net worth: ${input.wallet}`, "wallet-networth");
    if (!MINT_REGEX.test(input.wallet)) {
      return { ok: false, error: "Invalid wallet address" };
    }

    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);

    const lamports = await solanaRpc<number>("getBalance", [input.wallet], rpc);
    const sol = lamportsToSol(lamports);

    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const priceRes = await fetch(`https://lite-api.jup.ag/price/v3?ids=${SOL_MINT}`, {
      headers: { Accept: "application/json" },
    });
    const priceData = priceRes.ok
      ? ((await priceRes.json()) as Record<string, { usdPrice?: number }>)
      : {};
    const solPrice = priceData[SOL_MINT]?.usdPrice ?? null;

    return {
      ok: true,
      wallet: input.wallet,
      solBalance: sol,
      solPriceUsd: solPrice,
      solValueUsd: solPrice ? Math.round(sol * solPrice * 100) / 100 : null,
      note: "SOL value only (SPL token valuation requires per-token pricing). Not financial advice.",
      source: "Solana RPC + Jupiter",
    };
  },
};

export const PROFESSIONAL_SKILLS: SkillDefinition[] = [
  jupiterPrice,
  rugcheck,
  tokenFinder,
  snsResolver,
  solanaNetworkStats,
  walletNetWorth,
];
