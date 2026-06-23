/** AYRA scan — meme coin quality analysis */

export const AYRA_LEAF = "🍃";

/** /q quality command — max pair age window */
export const QUALITY_MAX_PAIR_AGE_HOURS = 7 * 24;
export const QUALITY_MAX_PAIR_AGE_MINUTES = QUALITY_MAX_PAIR_AGE_HOURS * 60;

/** Round MC milestones for legacy BUY band targets */
const MCAP_MILESTONES = [
  50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000,
];

export interface MemeMcapTargets {
  /** MC ~24h ago from DexScreener h24 change */
  mcap24hAgoUsd: number | null;
  /** Estimated 24h range low (MC) */
  mcap24hLowUsd: number | null;
  /** Pullback / support zone (MC) */
  correctionMcapUsd: number | null;
  /** Extension target (MC) */
  upsideMcapUsd: number | null;
  correctionNote: string;
  upsideNote: string;
}

export function computeTargetMcapMilestone(currentMcap: number): number {
  if (currentMcap < 100_000) return 500_000;
  if (currentMcap < 500_000) return 1_000_000;
  if (currentMcap < 1_000_000) return 2_000_000;
  if (currentMcap < 2_500_000) return 5_000_000;
  if (currentMcap < 5_000_000) return 10_000_000;
  for (const milestone of MCAP_MILESTONES) {
    if (milestone > currentMcap * 1.5) return milestone;
  }
  return 10_000_000;
}

function roundMcapEstimate(value: number): number {
  if (value >= 1_000_000) return Math.round(value / 25_000) * 25_000;
  if (value >= 100_000) return Math.round(value / 5_000) * 5_000;
  if (value >= 10_000) return Math.round(value / 1_000) * 1_000;
  return Math.round(value / 100) * 100;
}

function mcapFromPctAgo(currentMcap: number, changePct: number): number {
  return currentMcap / (1 + changePct / 100);
}

/**
 * Data-driven MC zones from DexScreener price change + pool liquidity (not round-number guesses).
 */
export function computeDataDrivenMcapTargets(token: {
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd?: number | null;
  change24hPct?: number | null;
  change6hPct?: number | null;
  change1hPct?: number | null;
}): MemeMcapTargets | null {
  const current = token.marketCapUsd;
  if (current == null || current <= 0 || !Number.isFinite(current)) return null;

  const ch24 = token.change24hPct ?? null;
  const mcap24hAgo =
    ch24 != null && Number.isFinite(ch24) ? roundMcapEstimate(mcapFromPctAgo(current, ch24)) : null;

  const lows: number[] = [];
  if (mcap24hAgo != null && mcap24hAgo > 0) lows.push(mcap24hAgo);
  if (token.change6hPct != null && Number.isFinite(token.change6hPct)) {
    lows.push(roundMcapEstimate(mcapFromPctAgo(current, token.change6hPct)));
  }
  if (token.change1hPct != null && Number.isFinite(token.change1hPct)) {
    lows.push(roundMcapEstimate(mcapFromPctAgo(current, token.change1hPct)));
  }
  const mcap24hLow = lows.length > 0 ? Math.min(...lows) : mcap24hAgo;

  const liqFloor =
    token.liquidityUsd != null && token.liquidityUsd > 0
      ? roundMcapEstimate(token.liquidityUsd * 5.5)
      : null;

  let correctionMcap: number | null = null;
  let correctionNote = "Insufficient 24h price data";

  if (mcap24hLow != null && mcap24hLow < current * 0.98) {
    const range = current - mcap24hLow;
    let retrace = 0.382;
    if (ch24 != null && ch24 > 150) retrace = 0.5;
    else if (ch24 != null && ch24 > 30 && ch24 <= 150) retrace = 1;
    else if (ch24 != null && ch24 <= 30) retrace = 0.382;

    const fibLevel = roundMcapEstimate(current - retrace * range);
    const pool: number[] = [fibLevel];
    if (retrace >= 1 && mcap24hAgo != null) pool.push(mcap24hAgo);
    if (liqFloor != null) pool.push(liqFloor);
    if (retrace < 1 && mcap24hAgo != null && mcap24hAgo > current * 0.35) pool.push(mcap24hAgo);

    const candidates = pool.filter((v) => v > current * 0.12 && v < current * 0.97);

    if (candidates.length > 0) {
      correctionMcap = roundMcapEstimate(
        candidates.reduce((sum, v) => sum + v, 0) / candidates.length
      );
      if (retrace >= 1) correctionNote = "24h base retrace (DexScreener h24)";
      else if (retrace >= 0.5) correctionNote = "50% fib retrace of 24h range";
      else correctionNote = "38% fib retrace of 24h range";
      if (liqFloor != null && liqFloor >= (correctionMcap ?? 0) * 0.85) {
        correctionNote += " · liq floor";
      }
    }
  } else if (liqFloor != null && liqFloor < current * 0.95) {
    correctionMcap = liqFloor;
    correctionNote = "Liquidity-based support (MC ≈ 5.5× pool)";
  }

  let upsideMcap: number | null = null;
  let upsideNote = "Insufficient range data";
  if (mcap24hLow != null && mcap24hLow < current) {
    const range = current - mcap24hLow;
    let extension = 0.618;
    const volMc =
      token.volume24hUsd != null && token.volume24hUsd > 0 ? token.volume24hUsd / current : null;
    if (volMc != null && volMc >= 1.5) extension = 1;
    if (ch24 != null && ch24 > 250) extension = Math.min(extension, 0.5);

    upsideMcap = roundMcapEstimate(current + extension * range);
    upsideNote =
      extension >= 1
        ? "1× 24h range extension · high vol/mc"
        : extension <= 0.5
          ? "0.5× range ext (extended move)"
          : "0.618× 24h range extension";
  }

  return {
    mcap24hAgoUsd: mcap24hAgo,
    mcap24hLowUsd: mcap24hLow,
    correctionMcapUsd: correctionMcap,
    upsideMcapUsd: upsideMcap,
    correctionNote,
    upsideNote,
  };
}

function formatMcapDeltaPct(from: number, to: number): string {
  const pct = ((to - from) / from) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

function formatMcapTargetLines(token: MemeTokenSnapshot): string[] {
  const lines: string[] = [];
  const targets = token.mcapTargets ?? computeDataDrivenMcapTargets(token);
  if (!targets || token.marketCapUsd == null) return lines;

  const current = token.marketCapUsd;
  if (targets.correctionMcapUsd != null) {
    lines.push(
      `Correction target: *${formatUsd(targets.correctionMcapUsd)}* (${formatMcapDeltaPct(current, targets.correctionMcapUsd)} · _${targets.correctionNote}_)`
    );
  }
  if (targets.upsideMcapUsd != null && targets.upsideMcapUsd > current * 1.03) {
    lines.push(
      `Upside target: *${formatUsd(targets.upsideMcapUsd)}* (${formatMcapDeltaPct(current, targets.upsideMcapUsd)} · _${targets.upsideNote}_)`
    );
  }
  return lines;
}

export const QUALITY_REPORT_FILTERS: MemeQualityFilters = {
  maxPairAgeMinutes: QUALITY_MAX_PAIR_AGE_MINUTES,
};

/** Tokens at or below this 24h change are excluded from memescan/trending lists */
export const MAX_DUMP_24H_PCT = -50;

export function passesDumpFilter(change24hPct: number | null | undefined): boolean {
  if (change24hPct == null || Number.isNaN(change24hPct)) return true;
  return change24hPct > MAX_DUMP_24H_PCT;
}

export interface MemeQualityFilters {
  minMarketCapUsd?: number;
  minVolume24hUsd?: number;
  minLiquidityUsd?: number;
  minHolders?: number;
  maxTop10HolderPct?: number;
  maxRugScore?: number;
  minPairAgeMinutes?: number;
  maxPairAgeMinutes?: number;
  minChange24hPct?: number;
}

export interface MemeTokenSnapshot {
  mint: string;
  symbol: string | null;
  name: string | null;
  priceUsd: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  liquidityUsd: number | null;
  holderCount: number | null;
  top10HolderPct: number | null;
  pairAgeMinutes: number | null;
  change24hPct: number | null;
  change6hPct: number | null;
  change1hPct: number | null;
  rugScoreNormalised: number | null;
  verdict: string | null;
  dexUrl: string | null;
  mcapTargets: MemeMcapTargets | null;
  passed: boolean;
  rejectReasons: string[];
}

const DEFAULT_FILTERS: Required<MemeQualityFilters> = {
  minMarketCapUsd: 25_000,
  minVolume24hUsd: 5_000,
  minLiquidityUsd: 3_000,
  minHolders: 50,
  maxTop10HolderPct: 35,
  maxRugScore: 60,
  minPairAgeMinutes: 0,
  maxPairAgeMinutes: 24 * 60,
  minChange24hPct: MAX_DUMP_24H_PCT,
};

function formatUsd(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(digits)}`;
}

function rugVerdict(score: number | null): string | null {
  if (score == null) return null;
  if (score <= 1) return "looks safe";
  if (score <= 30) return "low risk";
  if (score <= 60) return "medium risk";
  return "high risk";
}

async function fetchJupiterToken(mint: string) {
  try {
    const res = await fetch(`https://api.jup.ag/tokens/v2/search?query=${encodeURIComponent(mint)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const tokens = (await res.json()) as Array<{
      id?: string;
      symbol?: string;
      name?: string;
      holderCount?: number;
      mcap?: number;
      usdPrice?: number;
      liquidity?: number;
      priceChange24h?: number;
    }>;
    return tokens.find((t) => t.id === mint) ?? tokens[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchDexBestPair(mint: string) {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    pairs?: Array<{
      chainId: string;
      url?: string;
      pairCreatedAt?: number;
      baseToken?: { symbol?: string; name?: string };
      priceUsd?: string;
      priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
      volume?: { h24?: number };
      liquidity?: { usd?: number };
      marketCap?: number;
    }>;
  };
  const solPairs = (data.pairs ?? []).filter((p) => p.chainId === "solana");
  return solPairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] ?? null;
}

async function fetchRugcheck(mint: string) {
  const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const summary = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report/summary`, {
      headers: { Accept: "application/json" },
    });
    if (!summary.ok) return null;
    const s = (await summary.json()) as { score_normalised?: number; risks?: unknown[] };
    return { scoreNormalised: s.score_normalised ?? null, top10Pct: null as number | null };
  }
  const data = (await res.json()) as {
    score_normalised?: number;
    topHolders?: Array<{ pct?: number }>;
  };
  const top10Pct = (data.topHolders ?? [])
    .slice(0, 10)
    .reduce((sum, h) => sum + (h.pct ?? 0), 0);
  return { scoreNormalised: data.score_normalised ?? null, top10Pct: top10Pct || null };
}

export interface MemeFilterCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  failReason?: string;
  passNote?: string;
  recommendation?: string;
}

export function getMemeFilterChecks(
  snapshot: Omit<MemeTokenSnapshot, "passed" | "rejectReasons">,
  filters: MemeQualityFilters = {}
): MemeFilterCheck[] {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const checks: MemeFilterCheck[] = [];

  if (snapshot.marketCapUsd != null && snapshot.marketCapUsd < f.minMarketCapUsd) {
    checks.push({
      id: "mcap",
      label: "Market cap",
      passed: false,
      detail: `${formatUsd(snapshot.marketCapUsd)} · min ${formatUsd(f.minMarketCapUsd)}`,
      failReason: `MCAP below minimum ${formatUsd(f.minMarketCapUsd)}`,
      recommendation: "Market cap too small — high manipulation risk; wait for growth or skip.",
    });
  } else {
    checks.push({
      id: "mcap",
      label: "Market cap",
      passed: true,
      detail:
        snapshot.marketCapUsd != null
          ? `${formatUsd(snapshot.marketCapUsd)} · min ${formatUsd(f.minMarketCapUsd)}`
          : "No data · min " + formatUsd(f.minMarketCapUsd),
      passNote:
        snapshot.marketCapUsd != null
          ? "MCAP above AYRA minimum"
          : "No MCAP data — filter skipped",
    });
  }

  if (snapshot.volume24hUsd != null && snapshot.volume24hUsd < f.minVolume24hUsd) {
    checks.push({
      id: "volume",
      label: "Volume 24h",
      passed: false,
      detail: `${formatUsd(snapshot.volume24hUsd)} · min ${formatUsd(f.minVolume24hUsd)}`,
      failReason: `24h volume below ${formatUsd(f.minVolume24hUsd)}`,
      recommendation: "Weak trading activity — higher slippage and exit risk.",
    });
  } else {
    checks.push({
      id: "volume",
      label: "Volume 24h",
      passed: true,
      detail:
        snapshot.volume24hUsd != null
          ? `${formatUsd(snapshot.volume24hUsd)} · min ${formatUsd(f.minVolume24hUsd)}`
          : "No data · min " + formatUsd(f.minVolume24hUsd),
      passNote:
        snapshot.volume24hUsd != null
          ? "Enough volume for trading liquidity"
          : "No volume data — filter skipped",
    });
  }

  if (snapshot.liquidityUsd != null && snapshot.liquidityUsd < f.minLiquidityUsd) {
    checks.push({
      id: "liquidity",
      label: "Liquidity",
      passed: false,
      detail: `${formatUsd(snapshot.liquidityUsd)} · min ${formatUsd(f.minLiquidityUsd)}`,
      failReason: `Liquidity below ${formatUsd(f.minLiquidityUsd)}`,
      recommendation: "Thin pool — watch for large slippage on buy/sell.",
    });
  } else {
    checks.push({
      id: "liquidity",
      label: "Liquidity",
      passed: true,
      detail:
        snapshot.liquidityUsd != null
          ? `${formatUsd(snapshot.liquidityUsd)} · min ${formatUsd(f.minLiquidityUsd)}`
          : "No data · min " + formatUsd(f.minLiquidityUsd),
      passNote:
        snapshot.liquidityUsd != null
          ? "Pool liquidity is adequate"
          : "No liquidity data — filter skipped",
    });
  }

  if (snapshot.holderCount != null && snapshot.holderCount < f.minHolders) {
    checks.push({
      id: "holders",
      label: "Holders",
      passed: false,
      detail: `${snapshot.holderCount.toLocaleString()} · min ${f.minHolders}`,
      failReason: `Holders below ${f.minHolders}`,
      recommendation: "Holder distribution too narrow — whale dump risk.",
    });
  } else {
    checks.push({
      id: "holders",
      label: "Holders",
      passed: true,
      detail:
        snapshot.holderCount != null
          ? `${snapshot.holderCount.toLocaleString()} · min ${f.minHolders}`
          : `No data · min ${f.minHolders}`,
      passNote:
        snapshot.holderCount != null
          ? "Holder count meets baseline distribution"
          : "No holder data — filter skipped",
    });
  }

  if (snapshot.top10HolderPct == null) {
    checks.push({
      id: "top10",
      label: "Top-10 holders",
      passed: false,
      detail: "No data · max 35%",
      failReason: "Top-10 holder concentration unknown",
      recommendation: "Check Rugcheck/Solscan manually — incomplete holder data.",
    });
  } else if (snapshot.top10HolderPct > f.maxTop10HolderPct) {
    checks.push({
      id: "top10",
      label: "Top-10 holders",
      passed: false,
      detail: `${snapshot.top10HolderPct.toFixed(1)}% · max ${f.maxTop10HolderPct}%`,
      failReason: `Top-10 hold ${snapshot.top10HolderPct.toFixed(1)}% — above ${f.maxTop10HolderPct}% limit`,
      recommendation: "High whale dominance — monitor large wallets; keep size small.",
    });
  } else {
    checks.push({
      id: "top10",
      label: "Top-10 holders",
      passed: true,
      detail: `${snapshot.top10HolderPct.toFixed(1)}% · max ${f.maxTop10HolderPct}%`,
      passNote: "Top-10 holder concentration within safe range",
    });
  }

  if (snapshot.rugScoreNormalised != null && snapshot.rugScoreNormalised > f.maxRugScore) {
    checks.push({
      id: "rug",
      label: "Rug score",
      passed: false,
      detail: `${snapshot.rugScoreNormalised} · max ${f.maxRugScore}`,
      failReason: `Rug score ${snapshot.rugScoreNormalised} — above ${f.maxRugScore} limit`,
      recommendation: "High rugcheck score — verify LP lock, mint authority, and contract flags.",
    });
  } else {
    checks.push({
      id: "rug",
      label: "Rug score",
      passed: true,
      detail:
        snapshot.rugScoreNormalised != null
          ? `${snapshot.rugScoreNormalised} · max ${f.maxRugScore}${snapshot.verdict ? ` (${snapshot.verdict})` : ""}`
          : "No data · max " + f.maxRugScore,
      passNote:
        snapshot.rugScoreNormalised != null
          ? `Rugcheck: ${snapshot.verdict ?? "ok"}`
          : "No rug score data — filter skipped",
    });
  }

  if (snapshot.pairAgeMinutes != null && snapshot.pairAgeMinutes < f.minPairAgeMinutes) {
    checks.push({
      id: "pair_new",
      label: "Pair age",
      passed: false,
      detail: `${formatPairAge(snapshot.pairAgeMinutes)} · min ${formatPairAge(f.minPairAgeMinutes)}`,
      failReason: `Pair too new (${formatPairAge(snapshot.pairAgeMinutes)})`,
      recommendation: "Launch too fresh — wait for price and liquidity to stabilize.",
    });
  } else if (
    snapshot.pairAgeMinutes != null &&
    f.maxPairAgeMinutes > 0 &&
    snapshot.pairAgeMinutes > f.maxPairAgeMinutes
  ) {
    checks.push({
      id: "pair_old",
      label: "Pair age",
      passed: false,
      detail: `${formatPairAge(snapshot.pairAgeMinutes)} · max ${formatPairAge(f.maxPairAgeMinutes)}`,
      failReason: `Pair is ${formatPairAge(snapshot.pairAgeMinutes)} — outside ${formatPairAge(f.maxPairAgeMinutes)} window`,
      recommendation: "Launch momentum faded — look for a fresh setup or skip.",
    });
  } else {
    checks.push({
      id: "pair_age",
      label: "Pair age",
      passed: true,
      detail:
        snapshot.pairAgeMinutes != null
          ? `${formatPairAge(snapshot.pairAgeMinutes)} · window 0–${formatPairAge(f.maxPairAgeMinutes)}`
          : "No data",
      passNote:
        snapshot.pairAgeMinutes != null
          ? "Pair within AYRA age window"
          : "No pair age data — filter skipped",
    });
  }

  if (snapshot.change24hPct != null && snapshot.change24hPct <= f.minChange24hPct) {
    checks.push({
      id: "pnl",
      label: "PNL 24h",
      passed: false,
      detail: `${formatPnl24h(snapshot.change24hPct)} · min ${formatPnl24h(f.minChange24hPct)}`,
      failReason: `Dump ${formatPnl24h(snapshot.change24hPct)} — below ${formatPnl24h(f.minChange24hPct)} floor`,
      recommendation: "Heavy 24h sell-off — wait for stabilization before entry.",
    });
  } else {
    checks.push({
      id: "pnl",
      label: "PNL 24h",
      passed: true,
      detail:
        snapshot.change24hPct != null
          ? `${formatPnl24h(snapshot.change24hPct)} · min ${formatPnl24h(f.minChange24hPct)}`
          : "No data · min " + formatPnl24h(f.minChange24hPct),
      passNote:
        snapshot.change24hPct != null
          ? "No extreme 24h dump"
          : "No PNL data — filter skipped",
    });
  }

  return checks;
}

const CHECK_EMOJI: Record<string, string> = {
  mcap: "💰",
  volume: "📊",
  liquidity: "💧",
  holders: "👥",
  top10: "🐋",
  rug: "🛡️",
  pair_new: "⏱️",
  pair_old: "⏱️",
  pair_age: "⏱️",
  pnl: "📈",
};

function formatQualityCheckLine(check: MemeFilterCheck): string {
  const icon = CHECK_EMOJI[check.id] ?? "•";
  const status = check.passed ? "✅" : "❌";
  return `${icon} ${check.label}: ${check.detail}  ${status}`;
}

function formatQualityCheckNote(check: MemeFilterCheck): string | null {
  if (check.passed && check.passNote) {
    return `   _${check.passNote}_`;
  }
  if (!check.passed && check.failReason) {
    return `   → ${check.failReason}`;
  }
  return null;
}

function shouldRecommendBuy(token: MemeTokenSnapshot): boolean {
  if (!token.passed || token.priceUsd == null) return false;
  if (token.verdict === "high risk") return false;
  if (typeof token.change24hPct === "number" && token.change24hPct > 300) return false;
  return true;
}

function computeBuyTargets(token: MemeTokenSnapshot): {
  entry: number;
  target: number;
  targetMcap: number | null;
} | null {
  if (token.priceUsd == null || token.marketCapUsd == null || token.marketCapUsd <= 0) return null;

  const targets = token.mcapTargets ?? computeDataDrivenMcapTargets(token);
  let entry = token.priceUsd;
  let targetMcap: number | null = null;
  let target = token.priceUsd;

  if (targets?.correctionMcapUsd != null && targets.correctionMcapUsd < token.marketCapUsd) {
    entry = token.priceUsd * (targets.correctionMcapUsd / token.marketCapUsd);
  } else {
    entry = token.priceUsd * 0.97;
  }

  if (targets?.upsideMcapUsd != null && targets.upsideMcapUsd > token.marketCapUsd) {
    targetMcap = targets.upsideMcapUsd;
    target = token.priceUsd * (targets.upsideMcapUsd / token.marketCapUsd);
  } else {
    targetMcap = computeTargetMcapMilestone(token.marketCapUsd);
    target = token.priceUsd * (targetMcap / token.marketCapUsd);
  }

  return { entry, target, targetMcap };
}

function buildQualityRecommendations(
  token: MemeTokenSnapshot,
  checks: MemeFilterCheck[]
): string[] {
  const failed = checks.filter((c) => !c.passed);
  const recs: string[] = [];

  if (token.passed) {
    recs.push("Token passes AYRA baseline filters — still DYOR before entry.");
    recs.push("Verify socials, dev wallet, LP lock, and mint authority on Rugcheck/Solscan.");
    recs.push("Use a small position size; monitor liquidity and holder growth.");
    if (token.verdict === "medium risk" || token.verdict === "high risk") {
      recs.push(`Rugcheck: *${token.verdict}* — extra caution even though filters passed.`);
    }
    if (typeof token.change24hPct === "number" && token.change24hPct > 100) {
      recs.push("24h PNL is very high — pullback risk; avoid FOMO chasing.");
    }
    return recs;
  }

  for (const c of failed) {
    if (c.recommendation) recs.push(c.recommendation);
  }
  if (recs.length === 0) {
    recs.push("Improve failed metrics before reconsidering this token.");
  }
  recs.push("Compare with other tokens via `/ayrascan` once conditions improve.");

  return recs.slice(0, 5);
}

export function applyMemeFilters(
  snapshot: Omit<MemeTokenSnapshot, "passed" | "rejectReasons">,
  filters: MemeQualityFilters = {}
): { passed: boolean; rejectReasons: string[] } {
  const checks = getMemeFilterChecks(snapshot, filters);
  const rejectReasons = checks
    .filter((c) => !c.passed)
    .map((c) => c.failReason ?? c.label);
  return { passed: rejectReasons.length === 0, rejectReasons };
}

export async function analyzeMemeToken(
  mint: string,
  filters?: MemeQualityFilters
): Promise<MemeTokenSnapshot> {
  const [jup, pair, rug] = await Promise.all([
    fetchJupiterToken(mint),
    fetchDexBestPair(mint),
    fetchRugcheck(mint),
  ]);

  const pairAgeMinutes =
    pair?.pairCreatedAt != null
      ? Math.max(0, (Date.now() - pair.pairCreatedAt) / 60_000)
      : null;

  const rugScore = rug?.scoreNormalised ?? null;
  const change24hPct = pair?.priceChange?.h24 ?? jup?.priceChange24h ?? null;
  const change6hPct = pair?.priceChange?.h6 ?? null;
  const change1hPct = pair?.priceChange?.h1 ?? null;
  const base = {
    mint,
    symbol: pair?.baseToken?.symbol ?? jup?.symbol ?? null,
    name: pair?.baseToken?.name ?? jup?.name ?? null,
    priceUsd: jup?.usdPrice ?? (pair?.priceUsd ? parseFloat(pair.priceUsd) : null),
    marketCapUsd: pair?.marketCap ?? jup?.mcap ?? null,
    volume24hUsd: pair?.volume?.h24 ?? null,
    liquidityUsd: pair?.liquidity?.usd ?? jup?.liquidity ?? null,
    holderCount: jup?.holderCount ?? null,
    top10HolderPct: rug?.top10Pct ?? null,
    pairAgeMinutes,
    change24hPct,
    change6hPct,
    change1hPct,
    rugScoreNormalised: rugScore,
    verdict: rugVerdict(rugScore),
    dexUrl: pair?.url ?? `https://dexscreener.com/solana/${mint}`,
    mcapTargets: null as MemeMcapTargets | null,
  };

  base.mcapTargets = computeDataDrivenMcapTargets(base);

  const { passed, rejectReasons } = applyMemeFilters(base, filters);
  return { ...base, passed, rejectReasons };
}

export async function scanMemeCoins(options: {
  limit?: number;
  filters?: MemeQualityFilters;
  source?: "top" | "latest";
}): Promise<{ tokens: MemeTokenSnapshot[]; scanned: number; passed: number }> {
  const limit = options.limit ?? 10;
  const endpoint =
    options.source === "latest"
      ? "https://api.dexscreener.com/token-boosts/latest/v1"
      : "https://api.dexscreener.com/token-boosts/top/v1";

  const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`DexScreener boosts API ${res.status}`);

  const boosts = (await res.json()) as Array<{ chainId: string; tokenAddress?: string }>;
  const mints = boosts
    .filter((b) => b.chainId === "solana" && b.tokenAddress)
    .slice(0, Math.min(limit * 4, 40))
    .map((b) => b.tokenAddress!);

  const results = await Promise.all(
    mints.map((mint) => analyzeMemeToken(mint, options.filters))
  );

  const passed = results.filter((t) => t.passed && passesDumpFilter(t.change24hPct)).slice(0, limit);
  return { tokens: passed, scanned: results.length, passed: passed.length };
}

function formatPairAge(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 24 * 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / (24 * 60)).toFixed(1)}d`;
}

function formatScanPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function formatPnl24h(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatMemeScanEntry(token: MemeTokenSnapshot, index: number): string[] {
  const sym = token.symbol || token.name || "?";
  const verdict = token.verdict ?? "?";
  const lines: string[] = [`*${index + 1}. ${sym}* — ${verdict}`];

  if (typeof token.priceUsd === "number") {
    lines.push(`Price: ${formatScanPrice(token.priceUsd)}`);
  }

  if (typeof token.change24hPct === "number") {
    lines.push(`PNL 24h: ${formatPnl24h(token.change24hPct)}`);
  }

  lines.push(
    `MCAP ${formatUsd(token.marketCapUsd)} · Vol ${formatUsd(token.volume24hUsd)} · Liq ${formatUsd(token.liquidityUsd)}`
  );

  if (typeof token.holderCount === "number" || typeof token.top10HolderPct === "number") {
    const holders =
      typeof token.holderCount === "number" ? token.holderCount.toLocaleString() : "—";
    const top10 =
      typeof token.top10HolderPct === "number" ? `${token.top10HolderPct.toFixed(1)}%` : "—";
    lines.push(`Holders: ${holders} · Top-10: ${top10}`);
  }

  if (token.pairAgeMinutes != null) {
    lines.push(`Pair age: ${formatPairAge(token.pairAgeMinutes)}`);
  }

  lines.push("CA (tap to copy):");
  lines.push(`\`${token.mint}\``);
  if (token.dexUrl) lines.push(`[DexScreener](${token.dexUrl})`);

  return lines;
}

function formatTokenStatsLines(token: MemeTokenSnapshot, compact = false): string[] {
  const lines: string[] = [];
  if (compact) {
    const stats: string[] = [];
    if (typeof token.priceUsd === "number") stats.push(formatUsd(token.priceUsd, 6));
    if (typeof token.change24hPct === "number") stats.push(`PNL ${formatPnl24h(token.change24hPct)}`);
    if (typeof token.marketCapUsd === "number") stats.push(`MC ${formatUsd(token.marketCapUsd)}`);
    if (typeof token.volume24hUsd === "number") stats.push(`Vol ${formatUsd(token.volume24hUsd)}`);
    if (stats.length > 0) lines.push(stats.join(" · "));
    const row2: string[] = [];
    if (typeof token.liquidityUsd === "number") row2.push(`Liq ${formatUsd(token.liquidityUsd)}`);
    if (typeof token.holderCount === "number") row2.push(`${token.holderCount.toLocaleString()} holders`);
    if (typeof token.top10HolderPct === "number") row2.push(`Top10 ${token.top10HolderPct.toFixed(1)}%`);
    if (row2.length > 0) lines.push(row2.join(" · "));
    const row3: string[] = [];
    if (token.verdict) row3.push(`Rug: ${token.verdict} (${token.rugScoreNormalised ?? "?"})`);
    if (token.pairAgeMinutes != null) row3.push(`Age ${formatPairAge(token.pairAgeMinutes)}`);
    if (row3.length > 0) lines.push(row3.join(" · "));
  } else {
    if (typeof token.priceUsd === "number") lines.push(`Price: ${formatUsd(token.priceUsd, 6)}`);
    if (typeof token.change24hPct === "number") lines.push(`PNL 24h: ${formatPnl24h(token.change24hPct)}`);
    if (typeof token.marketCapUsd === "number") {
      lines.push(`MCAP: ${formatUsd(token.marketCapUsd)}`);
      lines.push(...formatMcapTargetLines(token));
    }
    if (typeof token.volume24hUsd === "number") lines.push(`Vol 24h: ${formatUsd(token.volume24hUsd)}`);
    if (typeof token.liquidityUsd === "number") lines.push(`Liquidity: ${formatUsd(token.liquidityUsd)}`);
    if (typeof token.holderCount === "number") lines.push(`Holders: ${token.holderCount.toLocaleString()}`);
    if (typeof token.top10HolderPct === "number") lines.push(`Top-10: ${token.top10HolderPct.toFixed(1)}%`);
    if (token.pairAgeMinutes != null) lines.push(`Pair age: ${formatPairAge(token.pairAgeMinutes)}`);
    if (token.verdict) lines.push(`Safety: *${token.verdict}* (${token.rugScoreNormalised ?? "?"})`);
  }
  if (token.rejectReasons.length > 0) {
    lines.push(`Failed: ${token.rejectReasons.slice(0, 3).join("; ")}`);
  }
  lines.push(`CA:\n\`${token.mint}\``);
  if (token.dexUrl) lines.push(`[DexScreener](${token.dexUrl})`);
  return lines;
}

export function formatMemeAlertCard(token: MemeTokenSnapshot): string {
  const sym = token.symbol || token.name || token.mint.slice(0, 8);
  const status = token.passed ? "passes AYRA filters" : "rejected";
  const lines = [
    `${token.passed ? AYRA_LEAF : "⚠️"} *${sym}* — ${status}`,
    ...formatTokenStatsLines(token),
    "_AYRA filters — not financial advice. DYOR._",
  ];
  return lines.join("\n");
}

/** Single-token quality report for /quality [CA] */
export function formatAyraQualityReport(
  token: MemeTokenSnapshot,
  options?: { agentName?: string }
): string {
  const sym = token.symbol || token.name || token.mint.slice(0, 8);
  const checks = getMemeFilterChecks(token, QUALITY_REPORT_FILTERS);
  const failedChecks = checks.filter((c) => !c.passed);
  const passedChecks = checks.filter((c) => c.passed);

  const lines = [
    `${AYRA_LEAF} *AYRA Quality Report*`,
    `*${sym}*`,
    token.passed
      ? "✅ *Passed AYRA filters* (max pair 7d)"
      : `❌ *Failed AYRA filters* (${failedChecks.length} checks · max pair 7d)`,
    "",
  ];

  if (typeof token.priceUsd === "number") {
    lines.push(`💵 Price: ${formatScanPrice(token.priceUsd)}`);
  }
  if (typeof token.change24hPct === "number") {
    lines.push(`📈 24h PNL: ${formatPnl24h(token.change24hPct)}`);
  }
  lines.push(
    `💰 MCAP ${formatUsd(token.marketCapUsd)} · 📊 Vol ${formatUsd(token.volume24hUsd)} · 💧 Liq ${formatUsd(token.liquidityUsd)}`
  );
  for (const targetLine of formatMcapTargetLines(token)) {
    lines.push(
      targetLine
        .replace("Correction target:", "📉 Correction MC:")
        .replace("Upside target:", "📈 Upside MC:")
    );
  }
  if (typeof token.holderCount === "number" || typeof token.top10HolderPct === "number") {
    const holders =
      typeof token.holderCount === "number" ? token.holderCount.toLocaleString() : "—";
    const top10 =
      typeof token.top10HolderPct === "number" ? `${token.top10HolderPct.toFixed(1)}%` : "—";
    lines.push(`👥 Holders: ${holders} · 🐋 Top-10: ${top10}`);
  }
  if (token.pairAgeMinutes != null) {
    lines.push(`⏱️ Pair age: ${formatPairAge(token.pairAgeMinutes)}`);
  }
  if (token.verdict) {
    lines.push(`🛡️ Rugcheck: *${token.verdict}* (${token.rugScoreNormalised ?? "?"})`);
  }

  if (shouldRecommendBuy(token)) {
    const targets = computeBuyTargets(token);
    const agentLabel = options?.agentName?.trim() || "AYRA Agent";
    if (targets) {
      lines.push("");
      lines.push(`🤖 *${agentLabel}* recommends *BUY* ✅`);
      lines.push(`🎯 Entry target: *${formatScanPrice(targets.entry)}*`);
      if (token.mcapTargets?.correctionMcapUsd != null) {
        lines.push(`📉 Entry MC zone: *${formatUsd(token.mcapTargets.correctionMcapUsd)}*`);
      }
      lines.push(`🚀 Price target: *${formatScanPrice(targets.target)}*`);
      if (targets.targetMcap != null) {
        lines.push(`📈 Upside MC: *${formatUsd(targets.targetMcap)}*`);
      }
    }
  } else if (token.passed) {
    lines.push("");
    lines.push("⚠️ *Watch only* — passed filters but setup is extended or higher risk.");
  }

  lines.push("");
  if (token.passed) {
    lines.push("*Why it passed:*");
    for (const c of passedChecks) {
      lines.push(formatQualityCheckLine(c));
      const note = formatQualityCheckNote(c);
      if (note) lines.push(note);
    }
  } else {
    lines.push("*Why it failed:*");
    for (const c of failedChecks) {
      lines.push(formatQualityCheckLine(c));
      const note = formatQualityCheckNote(c);
      if (note) lines.push(note);
    }
    if (passedChecks.length > 0) {
      lines.push("", "*Still OK:*");
      for (const c of passedChecks) {
        lines.push(formatQualityCheckLine(c));
        const note = formatQualityCheckNote(c);
        if (note) lines.push(note);
      }
    }
  }

  const recommendations = buildQualityRecommendations(token, checks);
  lines.push("", "*Notes:*");
  for (const rec of recommendations) {
    lines.push(`💡 ${rec}`);
  }

  lines.push("", "CA (tap to copy):");
  lines.push(`\`${token.mint}\``);
  if (token.dexUrl) lines.push(`[DexScreener](${token.dexUrl})`);
  lines.push("", "_AYRA filters — not financial advice. DYOR._");

  return lines.join("\n").trim();
}

export function formatMemeScanResults(data: {
  tokens: MemeTokenSnapshot[];
  scanned: number;
  passed: number;
}): string {
  if (data.tokens.length === 0) {
    return `${AYRA_LEAF} *Meme scan* — 0/${data.scanned} passed`;
  }

  const lines = [`${AYRA_LEAF} *Meme scan* — ${data.passed}/${data.scanned} passed`, ""];

  data.tokens.slice(0, 8).forEach((t, i) => {
    lines.push(...formatMemeScanEntry(t, i));
    if (i < Math.min(data.tokens.length, 8) - 1) lines.push("");
  });

  return lines.join("\n").trim();
}
