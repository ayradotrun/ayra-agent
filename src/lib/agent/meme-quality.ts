/** AYRA scan — meme coin quality analysis */

export const AYRA_LEAF = "🍃";

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
  rugScoreNormalised: number | null;
  verdict: string | null;
  dexUrl: string | null;
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
      priceChange?: { h24?: number };
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
      failReason: `MCAP di bawah minimum ${formatUsd(f.minMarketCapUsd)}`,
      recommendation: "Market cap terlalu kecil — risiko manipulasi tinggi, tunggu pertumbuhan atau skip.",
    });
  } else {
    checks.push({
      id: "mcap",
      label: "Market cap",
      passed: true,
      detail:
        snapshot.marketCapUsd != null
          ? `${formatUsd(snapshot.marketCapUsd)} · min ${formatUsd(f.minMarketCapUsd)}`
          : "Data tidak tersedia · min " + formatUsd(f.minMarketCapUsd),
      passNote:
        snapshot.marketCapUsd != null
          ? "MCAP di atas batas minimum AYRA"
          : "Data MCAP tidak ada — filter dilewati",
    });
  }

  if (snapshot.volume24hUsd != null && snapshot.volume24hUsd < f.minVolume24hUsd) {
    checks.push({
      id: "volume",
      label: "Volume 24h",
      passed: false,
      detail: `${formatUsd(snapshot.volume24hUsd)} · min ${formatUsd(f.minVolume24hUsd)}`,
      failReason: `Volume 24h di bawah ${formatUsd(f.minVolume24hUsd)}`,
      recommendation: "Aktivitas trading lemah — slippage & exit risk lebih tinggi.",
    });
  } else {
    checks.push({
      id: "volume",
      label: "Volume 24h",
      passed: true,
      detail:
        snapshot.volume24hUsd != null
          ? `${formatUsd(snapshot.volume24hUsd)} · min ${formatUsd(f.minVolume24hUsd)}`
          : "Data tidak tersedia · min " + formatUsd(f.minVolume24hUsd),
      passNote:
        snapshot.volume24hUsd != null
          ? "Volume cukup untuk likuiditas trading"
          : "Data volume tidak ada — filter dilewati",
    });
  }

  if (snapshot.liquidityUsd != null && snapshot.liquidityUsd < f.minLiquidityUsd) {
    checks.push({
      id: "liquidity",
      label: "Likuiditas",
      passed: false,
      detail: `${formatUsd(snapshot.liquidityUsd)} · min ${formatUsd(f.minLiquidityUsd)}`,
      failReason: `Likuiditas di bawah ${formatUsd(f.minLiquidityUsd)}`,
      recommendation: "Pool tipis — hati-hati slippage besar saat beli/jual.",
    });
  } else {
    checks.push({
      id: "liquidity",
      label: "Likuiditas",
      passed: true,
      detail:
        snapshot.liquidityUsd != null
          ? `${formatUsd(snapshot.liquidityUsd)} · min ${formatUsd(f.minLiquidityUsd)}`
          : "Data tidak tersedia · min " + formatUsd(f.minLiquidityUsd),
      passNote:
        snapshot.liquidityUsd != null
          ? "Likuiditas pool memadai"
          : "Data likuiditas tidak ada — filter dilewati",
    });
  }

  if (snapshot.holderCount != null && snapshot.holderCount < f.minHolders) {
    checks.push({
      id: "holders",
      label: "Holders",
      passed: false,
      detail: `${snapshot.holderCount.toLocaleString()} · min ${f.minHolders}`,
      failReason: `Holder di bawah ${f.minHolders}`,
      recommendation: "Distribusi holder terlalu sempit — risiko dump dari whale.",
    });
  } else {
    checks.push({
      id: "holders",
      label: "Holders",
      passed: true,
      detail:
        snapshot.holderCount != null
          ? `${snapshot.holderCount.toLocaleString()} · min ${f.minHolders}`
          : `Data tidak tersedia · min ${f.minHolders}`,
      passNote:
        snapshot.holderCount != null
          ? "Jumlah holder cukup untuk distribusi dasar"
          : "Data holder tidak ada — filter dilewati",
    });
  }

  if (snapshot.top10HolderPct == null) {
    checks.push({
      id: "top10",
      label: "Top-10 holders",
      passed: false,
      detail: "Data tidak tersedia · max 35%",
      failReason: "Konsentrasi top-10 holder tidak diketahui",
      recommendation: "Cek manual di Rugcheck/Solscan sebelum masuk — data holder tidak lengkap.",
    });
  } else if (snapshot.top10HolderPct > f.maxTop10HolderPct) {
    checks.push({
      id: "top10",
      label: "Top-10 holders",
      passed: false,
      detail: `${snapshot.top10HolderPct.toFixed(1)}% · max ${f.maxTop10HolderPct}%`,
      failReason: `Top-10 pegang ${snapshot.top10HolderPct.toFixed(1)}% — di atas batas ${f.maxTop10HolderPct}%`,
      recommendation: "Whale dominance tinggi — pantau wallet besar & jangan oversize.",
    });
  } else {
    checks.push({
      id: "top10",
      label: "Top-10 holders",
      passed: true,
      detail: `${snapshot.top10HolderPct.toFixed(1)}% · max ${f.maxTop10HolderPct}%`,
      passNote: "Konsentrasi holder top-10 dalam batas aman",
    });
  }

  if (snapshot.rugScoreNormalised != null && snapshot.rugScoreNormalised > f.maxRugScore) {
    checks.push({
      id: "rug",
      label: "Rug score",
      passed: false,
      detail: `${snapshot.rugScoreNormalised} · max ${f.maxRugScore}`,
      failReason: `Rug score ${snapshot.rugScoreNormalised} — di atas batas ${f.maxRugScore}`,
      recommendation: "Skor rugcheck tinggi — verifikasi LP lock, mint authority, & contract flags.",
    });
  } else {
    checks.push({
      id: "rug",
      label: "Rug score",
      passed: true,
      detail:
        snapshot.rugScoreNormalised != null
          ? `${snapshot.rugScoreNormalised} · max ${f.maxRugScore}${snapshot.verdict ? ` (${snapshot.verdict})` : ""}`
          : "Data tidak tersedia · max " + f.maxRugScore,
      passNote:
        snapshot.rugScoreNormalised != null
          ? `Rugcheck: ${snapshot.verdict ?? "ok"}`
          : "Data rug score tidak ada — filter dilewati",
    });
  }

  if (snapshot.pairAgeMinutes != null && snapshot.pairAgeMinutes < f.minPairAgeMinutes) {
    checks.push({
      id: "pair_new",
      label: "Umur pair",
      passed: false,
      detail: `${formatPairAge(snapshot.pairAgeMinutes)} · min ${formatPairAge(f.minPairAgeMinutes)}`,
      failReason: `Pair terlalu baru (${formatPairAge(snapshot.pairAgeMinutes)})`,
      recommendation: "Launch terlalu fresh — tunggu stabilisasi harga & likuiditas.",
    });
  } else if (
    snapshot.pairAgeMinutes != null &&
    f.maxPairAgeMinutes > 0 &&
    snapshot.pairAgeMinutes > f.maxPairAgeMinutes
  ) {
    checks.push({
      id: "pair_old",
      label: "Umur pair",
      passed: false,
      detail: `${formatPairAge(snapshot.pairAgeMinutes)} · max ${formatPairAge(f.maxPairAgeMinutes)}`,
      failReason: `Pair sudah ${formatPairAge(snapshot.pairAgeMinutes)} — di luar window ${formatPairAge(f.maxPairAgeMinutes)}`,
      recommendation: "Momentum launch sudah lewat — cari setup fresh atau skip.",
    });
  } else {
    checks.push({
      id: "pair_age",
      label: "Umur pair",
      passed: true,
      detail:
        snapshot.pairAgeMinutes != null
          ? `${formatPairAge(snapshot.pairAgeMinutes)} · window 0–${formatPairAge(f.maxPairAgeMinutes)}`
          : "Data tidak tersedia",
      passNote:
        snapshot.pairAgeMinutes != null
          ? "Pair dalam window usia yang AYRA pantau"
          : "Data umur pair tidak ada — filter dilewati",
    });
  }

  if (snapshot.change24hPct != null && snapshot.change24hPct <= f.minChange24hPct) {
    checks.push({
      id: "pnl",
      label: "PNL 24h",
      passed: false,
      detail: `${formatPnl24h(snapshot.change24hPct)} · min ${formatPnl24h(f.minChange24hPct)}`,
      failReason: `Dump ${formatPnl24h(snapshot.change24hPct)} — di bawah batas ${formatPnl24h(f.minChange24hPct)}`,
      recommendation: "Sell-off berat 24 jam — tunggu stabilisasi sebelum entry.",
    });
  } else {
    checks.push({
      id: "pnl",
      label: "PNL 24h",
      passed: true,
      detail:
        snapshot.change24hPct != null
          ? `${formatPnl24h(snapshot.change24hPct)} · min ${formatPnl24h(f.minChange24hPct)}`
          : "Data tidak tersedia · min " + formatPnl24h(f.minChange24hPct),
      passNote:
        snapshot.change24hPct != null
          ? "Tidak ada dump ekstrem 24 jam"
          : "Data PNL tidak ada — filter dilewati",
    });
  }

  return checks;
}

function buildQualityRecommendations(
  token: MemeTokenSnapshot,
  checks: MemeFilterCheck[]
): string[] {
  const failed = checks.filter((c) => !c.passed);
  const recs: string[] = [];

  if (token.passed) {
    recs.push("Token memenuhi semua filter dasar AYRA — tetap DYOR sebelum masuk.");
    recs.push("Cek socials, dev wallet, LP lock, & mint authority di Rugcheck/Solscan.");
    recs.push("Gunakan ukuran posisi kecil; pantau likuiditas & holder growth.");
    if (token.verdict === "medium risk" || token.verdict === "high risk") {
      recs.push(`Rugcheck: *${token.verdict}* — extra hati-hati meski lolos filter.`);
    }
    if (typeof token.change24hPct === "number" && token.change24hPct > 100) {
      recs.push("PNL 24h sangat tinggi — risiko pullback, jangan chase FOMO.");
    }
    return recs;
  }

  for (const c of failed) {
    if (c.recommendation) recs.push(c.recommendation);
  }
  if (recs.length === 0) {
    recs.push("Perbaiki metrik yang gagal sebelum dipertimbangkan lagi.");
  }
  recs.push("Bandingkan dengan token lain via `/memescan` setelah kondisi membaik.");

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
    rugScoreNormalised: rugScore,
    verdict: rugVerdict(rugScore),
    dexUrl: pair?.url ?? `https://dexscreener.com/solana/${mint}`,
  };

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
    if (typeof token.marketCapUsd === "number") lines.push(`MCAP: ${formatUsd(token.marketCapUsd)}`);
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
export function formatAyraQualityReport(token: MemeTokenSnapshot): string {
  const sym = token.symbol || token.name || token.mint.slice(0, 8);
  const checks = getMemeFilterChecks(token);
  const failedChecks = checks.filter((c) => !c.passed);
  const passedChecks = checks.filter((c) => c.passed);

  const lines = [
    `${AYRA_LEAF} *AYRA Quality Report*`,
    `*${sym}*`,
    token.passed ? "✅ *Lolos filter AYRA*" : `❌ *Tidak lolos filter AYRA* (${failedChecks.length} gagal)`,
    "",
  ];

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
  if (token.verdict) {
    lines.push(`Rugcheck: *${token.verdict}* (${token.rugScoreNormalised ?? "?"})`);
  }

  lines.push("");
  if (token.passed) {
    lines.push("*Kenapa lolos:*");
    for (const c of passedChecks) {
      lines.push(`✅ ${c.label}: ${c.detail}`);
      if (c.passNote) lines.push(`   _${c.passNote}_`);
    }
  } else {
    lines.push("*Kenapa tidak lolos:*");
    for (const c of failedChecks) {
      lines.push(`❌ ${c.label}: ${c.detail}`);
      if (c.failReason) lines.push(`   → ${c.failReason}`);
    }
    if (passedChecks.length > 0) {
      lines.push("", "*Yang masih ok:*");
      for (const c of passedChecks) {
        lines.push(`✅ ${c.label}: ${c.detail}`);
      }
    }
  }

  const recommendations = buildQualityRecommendations(token, checks);
  lines.push("", "*Rekomendasi:*");
  for (const rec of recommendations) {
    lines.push(`• ${rec}`);
  }

  lines.push("", "CA (tap to copy):");
  lines.push(`\`${token.mint}\``);
  if (token.dexUrl) lines.push(`[DexScreener](${token.dexUrl})`);
  lines.push("", "_Filter AYRA — bukan saran finansial. DYOR._");

  return lines.join("\n").trim();
}

/** Push notification card for auto AYRA alerts */
export function formatAyraPushAlert(token: MemeTokenSnapshot): string {
  return `${AYRA_LEAF} *AYRA alert*\n\n${formatMemeAlertCard(token)}`;
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
