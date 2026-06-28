import { z } from "zod";
import type { SkillDefinition } from "./base";
import {
  getMintInfo,
  getSolBalance,
  getSolanaRpcOptions,
  getTokenAccounts,
  lamportsToSol,
  solanaRpc,
} from "@/lib/solana";
import { prisma } from "@/lib/prisma";
import { performWebSearch } from "@/lib/search/web-search";

const ADDR_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,50}$/;

function isLikelyTxSig(value: string): boolean {
  return value.length >= 80 && value.length <= 90 && ADDR_REGEX.test(value);
}

async function fetchRugSummary(mint: string) {
  const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    score_normalised?: number;
    lpLockedPct?: number;
    risks?: Array<{ name?: string; level?: string; description?: string }>;
  };
}

async function fetchDexLiquidity(mint: string) {
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(mint)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    pairs?: Array<{ liquidity?: { usd?: number }; volume?: { h24?: number } }>;
  };
  const pairs = (data.pairs ?? []).filter((p) => (p.liquidity?.usd ?? 0) > 0);
  const best = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  return {
    pairCount: pairs.length,
    topLiquidityUsd: best?.liquidity?.usd ?? 0,
    volume24hUsd: best?.volume?.h24 ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 1. Real-time On-Chain Data — /oc
// ---------------------------------------------------------------------------
export const onChainQuery: SkillDefinition = {
  id: "on-chain-query",
  name: "On-Chain Query",
  slug: "on-chain-query",
  category: "Crypto",
  description:
    "Real-time Solana on-chain data: wallet balance & recent txs, transaction details, or token supply.",
  icon: "activity",
  permission: "network",
  isEnabled: false,
  inputSchema: z.object({
    target: z.string().min(32).max(90).describe("Wallet, mint, or transaction signature"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `On-chain query: ${input.target}`, "on-chain-query");
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);
    const target = input.target.trim();

    if (isLikelyTxSig(target)) {
      const tx = await solanaRpc<{
        slot?: number;
        blockTime?: number;
        meta?: { err?: unknown; fee?: number };
        transaction?: { message?: { accountKeys?: string[] } };
      } | null>("getTransaction", [target, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }], rpc);

      if (!tx) return { ok: false, error: "Transaction not found", target, type: "transaction" };

      return {
        ok: true,
        type: "transaction",
        target,
        slot: tx.slot ?? null,
        blockTime: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
        feeLamports: tx.meta?.fee ?? null,
        status: tx.meta?.err ? "failed" : "success",
        accounts: (tx.transaction?.message?.accountKeys ?? []).slice(0, 6),
        explorer: `https://orbmarkets.io/tx/${target}`,
      };
    }

    if (!ADDR_REGEX.test(target)) {
      return { ok: false, error: "Invalid address or signature" };
    }

    const mintInfo = await getMintInfo(target, rpc);
    if (mintInfo.found) {
      const supplyRaw = mintInfo.supply as string | number | undefined;
      const decimals = Number(mintInfo.decimals ?? 0);
      const supply =
        typeof supplyRaw === "string" || typeof supplyRaw === "number"
          ? Number(supplyRaw) / Math.pow(10, decimals)
          : null;

      return {
        ok: true,
        type: "token",
        target,
        mint: target,
        supply,
        decimals,
        mintAuthority: mintInfo.mintAuthority ?? null,
        freezeAuthority: mintInfo.freezeAuthority ?? null,
        mintRevoked: mintInfo.mintAuthority == null,
        freezeRevoked: mintInfo.freezeAuthority == null,
      };
    }

    const [balance, tokens, sigs] = await Promise.all([
      getSolBalance(target, rpc),
      getTokenAccounts(target, rpc),
      solanaRpc<Array<{ signature: string; blockTime?: number; err?: unknown }>>(
        "getSignaturesForAddress",
        [target, { limit: 5 }],
        rpc
      ),
    ]);

    const splWithBalance = tokens.filter((t) => t.amount > 0);

    return {
      ok: true,
      type: "wallet",
      target,
      wallet: target,
      solBalance: Number.isFinite(balance.sol) ? balance.sol : 0,
      tokenCount: splWithBalance.length,
      topTokens: splWithBalance.slice(0, 8).map((t) => ({ mint: t.mint, amount: t.amount })),
      recentTxs: sigs.map((s) => ({
        signature: s.signature,
        time: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
        status: s.err ? "failed" : "success",
      })),
      explorer: `https://orbmarkets.io/address/${target}`,
    };
  },
};

// ---------------------------------------------------------------------------
// 2. Security Audit & Alert — /audit
// ---------------------------------------------------------------------------
export const securityAudit: SkillDefinition = {
  id: "security-audit",
  name: "Security Audit",
  slug: "security-audit",
  category: "Crypto",
  description:
    "Scan token for rug pull, honeypot, backdoor risks (authorities, LP, liquidity) with alert level.",
  icon: "shield-alert",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    mint: z.string().min(32).max(50).describe("Token mint / CA"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Security audit: ${input.mint}`, "security-audit");
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);

    const [mintInfo, rug, dex] = await Promise.all([
      getMintInfo(input.mint, rpc),
      fetchRugSummary(input.mint),
      fetchDexLiquidity(input.mint),
    ]);

    const checks: Array<{ name: string; status: "pass" | "warn" | "fail"; detail: string }> = [];
    const risks = rug?.risks ?? [];

    const rugScore = rug?.score_normalised ?? null;
    if (rugScore == null) {
      checks.push({ name: "Rug score", status: "warn", detail: "No rugcheck data" });
    } else if (rugScore <= 30) {
      checks.push({ name: "Rug score", status: "pass", detail: `${rugScore}/100 — low risk` });
    } else if (rugScore <= 60) {
      checks.push({ name: "Rug score", status: "warn", detail: `${rugScore}/100 — medium risk` });
    } else {
      checks.push({ name: "Rug score", status: "fail", detail: `${rugScore}/100 — high risk` });
    }

    if (mintInfo.found) {
      if (mintInfo.mintAuthority) {
        checks.push({
          name: "Mint authority",
          status: "fail",
          detail: "Active — owner can mint more supply (backdoor risk)",
        });
      } else {
        checks.push({ name: "Mint authority", status: "pass", detail: "Revoked" });
      }
      if (mintInfo.freezeAuthority) {
        checks.push({
          name: "Freeze authority",
          status: "fail",
          detail: "Active — accounts can be frozen (honeypot risk)",
        });
      } else {
        checks.push({ name: "Freeze authority", status: "pass", detail: "Revoked" });
      }
    }

    const liq = dex?.topLiquidityUsd ?? 0;
    if (liq < 1000) {
      checks.push({
        name: "Liquidity",
        status: "fail",
        detail: `$${liq.toFixed(0)} — very low, hard to sell`,
      });
    } else if (liq < 10000) {
      checks.push({ name: "Liquidity", status: "warn", detail: `$${liq.toFixed(0)} — thin pool` });
    } else {
      checks.push({ name: "Liquidity", status: "pass", detail: `$${liq.toFixed(0)} on DEX` });
    }

    const lpLocked = rug?.lpLockedPct ?? null;
    if (lpLocked != null) {
      checks.push({
        name: "LP lock",
        status: lpLocked >= 80 ? "pass" : lpLocked >= 40 ? "warn" : "fail",
        detail: `${lpLocked}% locked`,
      });
    }

    for (const r of risks.slice(0, 4)) {
      const level = (r.level ?? "").toLowerCase();
      checks.push({
        name: r.name ?? "Risk flag",
        status: level.includes("high") || level.includes("critical") ? "fail" : "warn",
        detail: r.description ?? r.level ?? "Flagged",
      });
    }

    const failCount = checks.filter((c) => c.status === "fail").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;
    const alertLevel =
      failCount >= 2 ? "critical" : failCount >= 1 ? "high" : warnCount >= 2 ? "medium" : "low";

    const alertMessage =
      alertLevel === "critical"
        ? "⛔ Do NOT trade — multiple critical flags."
        : alertLevel === "high"
          ? "⚠️ High risk — review before any buy."
          : alertLevel === "medium"
            ? "🟡 Caution — some warnings detected."
            : "✅ Looks relatively safe — still DYOR.";

    return {
      ok: true,
      mint: input.mint,
      alertLevel,
      alertMessage,
      checks,
      rugScore,
      lpLockedPct: lpLocked,
      liquidityUsd: liq,
      suggestAlert: alertLevel === "critical" || alertLevel === "high",
      note: "Automated scan — not a formal audit. Use /rug for quick rug score.",
    };
  },
};

// ---------------------------------------------------------------------------
// 3. Program Deploy Monitor — /prog
// ---------------------------------------------------------------------------
export const programMonitor: SkillDefinition = {
  id: "program-monitor",
  name: "Program Monitor",
  slug: "program-monitor",
  category: "Developer",
  description:
    "Monitor Solana program deployment health (executable status, owner, data size). Read-only — no deploy/rollback.",
  icon: "rocket",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    programId: z.string().min(32).max(50).describe("Solana program ID"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Program monitor: ${input.programId}`, "program-monitor");
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);

    const info = await solanaRpc<{
      value: {
        executable?: boolean;
        lamports?: number;
        owner?: string;
        data?: string[] | unknown;
      } | null;
    }>("getAccountInfo", [input.programId, { encoding: "base64" }], rpc);

    const acc = info.value;
    if (!acc) {
      return { ok: false, programId: input.programId, error: "Program account not found" };
    }

    const dataLen = Array.isArray(acc.data) ? (acc.data[0] as string)?.length ?? 0 : 0;
    const health =
      acc.executable === true ? "healthy" : acc.executable === false ? "not_executable" : "unknown";

    let upgradeNote = "";
    const owner = acc.owner ?? "";
    if (owner.includes("BPFLoaderUpgradeab1e")) {
      upgradeNote = "Upgradeable BPF program — monitor upgrade authority separately.";
    } else if (owner.includes("BPFLoader")) {
      upgradeNote = "Legacy BPF program.";
    }

    return {
      ok: true,
      programId: input.programId,
      health,
      executable: acc.executable ?? false,
      owner,
      lamports: acc.lamports ?? 0,
      solBalance: lamportsToSol(acc.lamports ?? 0),
      dataSizeBytes: dataLen,
      upgradeNote,
      rollbackHint:
        health === "healthy"
          ? "Auto-rollback requires CI/CD + upgrade authority key — not available in chat."
          : "Program may be corrupted or closed — investigate deployment logs.",
      explorer: `https://orbmarkets.io/address/${input.programId}`,
    };
  },
};

// ---------------------------------------------------------------------------
// 4. Market Sentiment & News — /news
// ---------------------------------------------------------------------------
const BULLISH = /\b(surge|rally|bull|gain|up|soar|breakout|ath|green|pump|approval|launch)\b/i;
const BEARISH = /\b(crash|bear|drop|down|hack|exploit|rug|scam|ban|sec|fear|dump|liquidat)\b/i;

export const marketSentiment: SkillDefinition = {
  id: "market-sentiment",
  name: "Market Sentiment",
  slug: "market-sentiment",
  category: "Research",
  description: "Aggregate crypto news & web results with bullish/bearish sentiment summary.",
  icon: "newspaper",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    topic: z.string().min(1).max(80).optional().describe("Topic, e.g. Solana, BTC"),
  }),
  async execute(input, ctx) {
    const topic = input.topic?.trim() || "Solana crypto";
    await ctx.log("INFO", `Market sentiment: ${topic}`, "market-sentiment");

    const [search, feedRes] = await Promise.all([
      performWebSearch(`${topic} news today`, 6, ctx.userId),
      fetch("https://cointelegraph.com/rss/tag/solana", { headers: { Accept: "application/xml" } }).catch(
        () => null
      ),
    ]);

    const headlines: Array<{ title: string; url?: string; source: string }> = [];

    if (search.ok && search.related?.length) {
      for (const r of search.related.slice(0, 5)) {
        headlines.push({ title: r.title ?? "", url: r.url, source: "web" });
      }
    }

    if (feedRes?.ok) {
      const xml = await feedRes.text();
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      let match;
      while ((match = itemRegex.exec(xml)) && headlines.length < 10) {
        const block = match[1];
        const title = block
          .match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]
          ?.trim()
          .replace(/<[^>]+>/g, "");
        const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim();
        if (title && (!input.topic || title.toLowerCase().includes(topic.split(/\s+/)[0].toLowerCase()))) {
          headlines.push({ title, url: link, source: "cointelegraph" });
        }
      }
    }

    let bull = 0;
    let bear = 0;
    for (const h of headlines) {
      if (BULLISH.test(h.title)) bull++;
      if (BEARISH.test(h.title)) bear++;
    }

    const total = headlines.length || 1;
    const sentimentScore = Math.round(((bull - bear) / total) * 100);
    const sentimentLabel =
      sentimentScore >= 25 ? "bullish" : sentimentScore <= -25 ? "bearish" : "neutral";

    const insight =
      sentimentLabel === "bullish"
        ? `News flow leans positive (${bull} bullish vs ${bear} bearish signals).`
        : sentimentLabel === "bearish"
          ? `News flow leans cautious (${bear} bearish vs ${bull} bullish signals).`
          : `Mixed signals (${bull} bullish, ${bear} bearish in ${headlines.length} headlines).`;

    return {
      ok: headlines.length > 0,
      topic,
      sentimentLabel,
      sentimentScore,
      insight,
      headlines: headlines.slice(0, 8),
      searchSummary: search.summary ?? null,
    };
  },
};

// ---------------------------------------------------------------------------
// 5. Tokenomics Simulator — /sim
// ---------------------------------------------------------------------------
export const tokenomicsSim: SkillDefinition = {
  id: "tokenomics-sim",
  name: "Tokenomics Simulator",
  slug: "tokenomics-sim",
  category: "Crypto",
  description: "Simulate supply burn, inflation, and staking rewards from live mint supply.",
  icon: "calculator",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    mint: z.string().min(32).max(50),
    burnPct: z.number().min(0).max(99).optional(),
    stakeApr: z.number().min(0).max(500).optional(),
    stakeRatio: z.number().min(0).max(1).optional().describe("Share of supply staked, 0-1"),
    months: z.number().min(1).max(120).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Tokenomics sim: ${input.mint}`, "tokenomics-sim");
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);
    const mintInfo = await getMintInfo(input.mint, rpc);

    if (!mintInfo.found) {
      return { ok: false, mint: input.mint, error: "Mint not found on-chain" };
    }

    const decimals = Number(mintInfo.decimals ?? 0);
    const supplyRaw = Number(mintInfo.supply ?? 0);
    const currentSupply = supplyRaw / Math.pow(10, decimals);

    const burnPct = input.burnPct ?? 10;
    const stakeApr = input.stakeApr ?? 20;
    const stakeRatio = input.stakeRatio ?? 0.5;
    const months = input.months ?? 12;

    const afterBurn = currentSupply * (1 - burnPct / 100);
    const staked = afterBurn * stakeRatio;
    const monthlyRate = stakeApr / 100 / 12;
    const rewards = staked * monthlyRate * months;
    const finalCirculating = afterBurn + rewards;

    const scenarios = [
      {
        name: `Burn ${burnPct}%`,
        supply: afterBurn,
        changePct: -burnPct,
      },
      {
        name: `Stake ${(stakeRatio * 100).toFixed(0)}% @ ${stakeApr}% APR (${months}mo)`,
        stakedAmount: staked,
        rewardsMinted: rewards,
        finalSupply: finalCirculating,
        inflationPct: ((finalCirculating - afterBurn) / afterBurn) * 100,
      },
    ];

    return {
      ok: true,
      mint: input.mint,
      currentSupply,
      decimals,
      mintAuthority: mintInfo.mintAuthority ?? null,
      scenarios,
      params: { burnPct, stakeApr, stakeRatio, months },
      note: "Simple projection — assumes constant APR and no other mint/burn events.",
    };
  },
};

// ---------------------------------------------------------------------------
// 6. Multi-Wallet Batch — /mw
// ---------------------------------------------------------------------------
export const multiWalletBatch: SkillDefinition = {
  id: "multi-wallet",
  name: "Multi-Wallet Batch",
  slug: "multi-wallet",
  category: "Crypto",
  description: "Check SOL balance for multiple wallets at once (read-only — no signing).",
  icon: "wallet",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    wallets: z.array(z.string().min(32).max(50)).min(1).max(10),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Multi-wallet: ${input.wallets.length} addresses`, "multi-wallet");
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);

    const holdings = await Promise.all(
      input.wallets.map(async (wallet: string) => {
        try {
          const bal = await getSolBalance(wallet, rpc);
          return { wallet, sol: bal.sol, ok: true };
        } catch {
          return { wallet, sol: 0, ok: false, error: "Failed to fetch" };
        }
      })
    );

    const totalSol = holdings.reduce((sum, h) => sum + (h.ok ? h.sol : 0), 0);

    return {
      ok: true,
      walletCount: input.wallets.length,
      totalSol,
      holdings,
      note: "Read-only balance check. Batch send requires wallet keys outside AYRA.",
    };
  },
};

// ---------------------------------------------------------------------------
// 7. DeFi Yield Optimizer — /yield
// ---------------------------------------------------------------------------
export const yieldOptimizer: SkillDefinition = {
  id: "yield-optimizer",
  name: "Yield Optimizer",
  slug: "yield-optimizer",
  category: "Crypto",
  description: "Compare top Solana DeFi yield pools by APY, TVL, and IL risk.",
  icon: "trending-up",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    query: z.string().max(40).optional().describe("Filter by token symbol, e.g. SOL, USDC"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Yield optimizer: ${input.query ?? "top"}`, "yield-optimizer");
    const res = await fetch("https://yields.llama.fi/pools", { headers: { Accept: "application/json" } });
    if (!res.ok) return { ok: false, error: `DefiLlama API ${res.status}` };

    const data = (await res.json()) as {
      data?: Array<{
        pool?: string;
        chain?: string;
        project?: string;
        symbol?: string;
        tvlUsd?: number;
        apy?: number;
        apyBase?: number;
        ilRisk?: string;
        stablecoin?: boolean;
        exposure?: string;
      }>;
    };

    let pools = (data.data ?? []).filter(
      (p) => p.chain === "Solana" && (p.apy ?? 0) > 0 && (p.tvlUsd ?? 0) > 50000
    );

    const q = input.query?.trim().toUpperCase();
    if (q) {
      pools = pools.filter((p) => (p.symbol ?? "").toUpperCase().includes(q));
    }

    pools = pools
      .sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
      .slice(0, q ? 8 : 10);

    const picks = pools.map((p) => ({
      symbol: p.symbol,
      project: p.project,
      apy: Math.round((p.apy ?? 0) * 100) / 100,
      apyBase: p.apyBase ?? null,
      tvlUsd: p.tvlUsd ?? 0,
      ilRisk: p.ilRisk ?? "unknown",
      exposure: p.exposure ?? null,
      poolId: p.pool ?? null,
      url: p.pool ? `https://defillama.com/yields/pool/${p.pool}` : null,
      riskNote:
        p.ilRisk === "yes"
          ? "Impermanent loss risk"
          : p.stablecoin
            ? "Stablecoin pool — lower IL"
            : "Single-asset or low IL",
    }));

    return {
      ok: picks.length > 0,
      query: q ?? null,
      pools: picks,
      source: "DefiLlama",
      note: "Higher APY often means higher smart-contract & IL risk — DYOR.",
    };
  },
};

export const CRYPTO_ADVANCED_SKILLS: SkillDefinition[] = [
  securityAudit,
  programMonitor,
  marketSentiment,
  tokenomicsSim,
  yieldOptimizer,
];
