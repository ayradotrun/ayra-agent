import type { OpenRouterMessage } from "@/lib/openrouter";
import { messageContentToString } from "@/lib/openrouter";
import { formatTokenCard, type TokenCardData } from "@/lib/agent/token-card";
import { formatMemeScanResults, formatAyraQualityReport, type MemeTokenSnapshot } from "@/lib/agent/meme-quality";
import {
  formatTokenHoldingAmount,
  formatTokenHoldingLabel,
} from "@/lib/token-holdings";

function parseToolContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function formatUsd(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}% (24h)`;
}

function shortWalletAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

function formatFunderType(type?: string): string {
  if (!type) return "";
  const normalized = type.toLowerCase();
  if (normalized === "exchange") return "exchange";
  return type;
}

function formatFundingFunderLine(f: {
  funder?: string;
  funderName?: string;
  funderType?: string;
}): string {
  const addr = f.funder?.trim();
  const name = f.funderName?.trim();
  const typeLabel = formatFunderType(f.funderType);

  if (name && addr) {
    const typeSuffix = typeLabel ? ` (${typeLabel})` : "";
    return `• Funder: ${name}${typeSuffix} — \`${addr}\``;
  }

  if (name) {
    return `• Funder: ${name}${typeLabel ? ` (${typeLabel})` : ""}`;
  }

  if (addr) {
    return `• Funder: \`${addr}\`${typeLabel ? ` (${typeLabel})` : ""}`;
  }

  return "• Funder: —";
}

export interface FormatToolResultContext {
  agentName?: string;
  skillSlug?: string;
}

export function formatToolResult(data: unknown, context?: FormatToolResultContext): string | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;

  if (r.ok === false && typeof r.error === "string") {
    return `❌ ${r.error}`;
  }

  if (typeof r.found === "boolean" && typeof r.mint === "string" && r.priceUsd == null && !r.type) {
    if (!r.found) {
      return `❌ Mint not found: \`${String(r.mint)}\``;
    }
    const supplyRaw = r.supply;
    const decimals = Number(r.decimals ?? 0);
    let supplyText = "—";
    if (typeof supplyRaw === "string" || typeof supplyRaw === "number") {
      const raw = Number(supplyRaw);
      if (Number.isFinite(raw)) {
        supplyText = (raw / Math.pow(10, decimals)).toLocaleString("en-US");
      }
    }
    const lines = [
      `📋 *Mint Info*`,
      `CA: \`${String(r.mint)}\``,
      `Supply: *${supplyText}*`,
      `Decimals: ${decimals}`,
      `Mint authority: ${r.mintAuthority ? "⚠️ active" : "✅ revoked"}`,
      `Freeze authority: ${r.freezeAuthority ? "⚠️ active" : "✅ revoked"}`,
      `[Solscan](https://solscan.io/token/${String(r.mint)})`,
    ];
    return lines.join("\n");
  }

  if (typeof r.latencyMs === "number" && typeof r.health === "string") {
    const lines = [`⚡ *RPC Health*`];
    lines.push(`Status: *${String(r.health).toUpperCase()}*`);
    if (r.currentSlot != null) lines.push(`Slot: ${Number(r.currentSlot).toLocaleString("en-US")}`);
    lines.push(`Latency: ${r.latencyMs}ms`);
    if (r.endpoint) lines.push(`Endpoint: ${String(r.endpoint)}`);
    return lines.join("\n");
  }

  if (r.symbol === "SOL" && typeof r.priceUsd === "number") {
    const lines = [
      `💰 *SOL (Solana)*`,
      `Price: *${formatUsd(r.priceUsd)}*`,
    ];
    if (typeof r.change24h === "number") lines.push(`24h: ${formatPct(r.change24h)}`);
    if (typeof r.marketCapUsd === "number") lines.push(`Market cap: ${formatUsd(r.marketCapUsd, 0)}`);
    if (typeof r.volume24hUsd === "number") lines.push(`Volume 24h: ${formatUsd(r.volume24hUsd, 0)}`);
    lines.push("_Source: CoinGecko — not financial advice._");
    return lines.join("\n");
  }

  if (typeof r.riskScoreNormalised === "number" && r.verdict) {
    const lines = [`🛡 *Rugcheck${r.mint ? ` — ${String(r.mint).slice(0, 8)}…` : ""}*`];
    lines.push(`Verdict: *${String(r.verdict)}*`);
    lines.push(`Risk score: ${r.riskScoreNormalised}/100`);
    if (typeof r.lpLockedPct === "number") lines.push(`LP locked: ${r.lpLockedPct}%`);
    const risks = Array.isArray(r.risks) ? (r.risks as Array<{ name?: string; level?: string }>) : [];
    if (risks.length > 0) {
      lines.push(`Flags: ${risks.slice(0, 5).map((x) => x.name || x.level).filter(Boolean).join(", ")}`);
    } else {
      lines.push("No major risk flags.");
    }
    lines.push("_rugcheck.xyz — DYOR, not financial advice._");
    return lines.join("\n");
  }

  if (typeof r.tps === "number" || (r.epoch != null && r.epochProgressPct != null)) {
    const lines = [`📊 *Solana Network*`];
    if (typeof r.tps === "number") lines.push(`TPS: *${r.tps.toLocaleString("en-US")}*`);
    if (r.epoch != null) lines.push(`Epoch: ${r.epoch} (${r.epochProgressPct ?? "?"}%)`);
    if (r.validatorVersion) lines.push(`Version: ${r.validatorVersion}`);
    return lines.join("\n");
  }

  if (r.owner && r.domain) {
    return `🔗 *${String(r.domain)}*\nOwner: \`${String(r.owner)}\``;
  }

  if (typeof r.scanned === "number" && Array.isArray(r.tokens)) {
    return formatMemeScanResults(r as { tokens: MemeTokenSnapshot[]; scanned: number; passed: number });
  }

  if (
    r.mint &&
    typeof r.passed === "boolean" &&
    Array.isArray(r.rejectReasons) &&
    typeof r.scanned !== "number"
  ) {
    return formatAyraQualityReport(r as unknown as MemeTokenSnapshot, {
      agentName: context?.agentName,
    });
  }

  if (typeof r.solBalance === "number" && r.wallet && r.type !== "wallet") {
    const short = shortWalletAddress(String(r.wallet));
    const sol = Number.isFinite(r.solBalance) ? r.solBalance : 0;
    const lines = [`🕵️ *Wallet Analyzer* — \`${short}\``, `SOL: *${sol.toFixed(4)}*`];
    if (typeof r.tokenCount === "number") lines.push(`Token holdings: ${r.tokenCount}`);

    if (Array.isArray(r.tokens) && r.tokens.length > 0) {
      lines.push("", "*Top 3 holdings:*");
      (
        r.tokens as Array<{ symbol?: string; name?: string; mint?: string; amount?: number; decimals?: number }>
      )
        .slice(0, 3)
        .forEach((t) => {
          lines.push(
            `• ${formatTokenHoldingLabel(t)}: ${formatTokenHoldingAmount(t.amount ?? 0, t.decimals)}`
          );
        });
    }

    if (r.identity && typeof r.identity === "object") {
      const id = r.identity as { name?: string; category?: string };
      if (id.name) lines.push(`Identity: ${id.name}${id.category ? ` (${id.category})` : ""}`);
    }

    if (r.funding && typeof r.funding === "object") {
      const f = r.funding as {
        funder?: string;
        funderName?: string;
        funderType?: string;
        amount?: number;
        timestamp?: number;
        signature?: string;
      };
      lines.push("", "💰 *Funding source*");
      lines.push(formatFundingFunderLine(f));
      if (typeof f.amount === "number") lines.push(`• Amount: ${f.amount} SOL`);
      if (f.timestamp) lines.push(`• Date: ${new Date(f.timestamp * 1000).toLocaleString()}`);
      if (f.signature) lines.push(`• [Tx on Orb](https://orbmarkets.io/tx/${f.signature})`);
    } else if (r.heliusConfigured === false) {
      lines.push("", "_Funding/bundle analysis: set Helius RPC or API key in Dashboard → Settings → Solana_");
    } else if (r.funding === null && r.heliusConfigured) {
      lines.push("", "💰 Funding source: not found (old wallet or untracked bridge).");
    }

    if (typeof r.heliusError === "string" && r.heliusError.trim()) {
      lines.push("", `⚠️ ${r.heliusError}`);
    }

    if (typeof r.rpcError === "string" && r.rpcError.trim()) {
      lines.push("", `⚠️ RPC: ${r.rpcError}`);
    }

    if (r.isFundBundled === true) {
      lines.push("", "⚠️ *Suspicious funding bundle* — funder shows high-frequency distribution.");
    }

    if (r.tokenAnalysis && typeof r.tokenAnalysis === "object") {
      const ta = r.tokenAnalysis as {
        mint?: string;
        transferCount?: number;
        isTokenBundled?: boolean;
        distributor?: string;
        recipientCount?: number;
      };
      lines.push("", `🪙 *Token ${String(ta.mint).slice(0, 8)}…*`);
      if (typeof ta.transferCount === "number") lines.push(`Transfers: ${ta.transferCount}`);
      if (ta.isTokenBundled) {
        lines.push(
          `⚠️ Suspicious token bundle${ta.recipientCount ? ` (${ta.recipientCount} wallets)` : ""}.`
        );
      } else if (ta.transferCount && ta.transferCount > 0) {
        lines.push("✅ No suspicious token bundling detected.");
      }
    }

    lines.push("_Helius walletanalyzer-style — DYOR._");
    return lines.join("\n");
  }

  if (r.type === "wallet" && typeof r.solBalance === "number" && r.wallet) {
    const short = `${String(r.wallet).slice(0, 4)}…${String(r.wallet).slice(-4)}`;
    const sol = Number.isFinite(r.solBalance) ? r.solBalance : 0;
    const lines = [`⛓ *On-Chain — Wallet* \`${short}\``, `SOL: *${sol.toFixed(4)}*`];
    if (typeof r.tokenCount === "number") lines.push(`SPL tokens: ${r.tokenCount}`);
    const top = Array.isArray(r.topTokens) ? r.topTokens : [];
    if (top.length > 0) {
      lines.push("", "*Top SPL:*");
      (top as Array<{ mint?: string; amount?: number }>).slice(0, 5).forEach((t) => {
        const mint = String(t.mint ?? "");
        const label = mint ? `${mint.slice(0, 6)}…${mint.slice(-4)}` : "?";
        lines.push(`• ${label}: ${t.amount ?? "?"}`);
      });
    }
    const txs = Array.isArray(r.recentTxs) ? r.recentTxs : [];
    if (txs.length > 0) {
      lines.push("", "*Recent txs:*");
      (txs as Array<{ signature?: string; status?: string }>).slice(0, 3).forEach((t) => {
        lines.push(`• \`${String(t.signature).slice(0, 8)}…\` ${t.status ?? ""}`);
      });
    }
    if (r.explorer) lines.push(`[Orb](${String(r.explorer)})`);
    return lines.join("\n");
  }

  if (r.type === "transaction" && r.target) {
    const lines = [`⛓ *On-Chain — Transaction*`];
    lines.push(`Status: *${String(r.status ?? "?")}*`);
    if (r.blockTime) lines.push(`Time: ${String(r.blockTime).slice(0, 19)}`);
    if (r.feeLamports != null) lines.push(`Fee: ${Number(r.feeLamports) / 1e9} SOL`);
    if (r.explorer) lines.push(`[View on Orb](${String(r.explorer)})`);
    return lines.join("\n");
  }

  if (r.type === "token" && r.mint && r.supply != null) {
    const lines = [`⛓ *On-Chain — Token Supply*`];
    lines.push(`Mint: \`${String(r.mint).slice(0, 8)}…\``);
    lines.push(`Supply: *${Number(r.supply).toLocaleString()}*`);
    if (r.decimals != null) lines.push(`Decimals: ${r.decimals}`);
    lines.push(`Mint auth: ${r.mintRevoked ? "✅ revoked" : "⚠️ active"}`);
    lines.push(`Freeze auth: ${r.freezeRevoked ? "✅ revoked" : "⚠️ active"}`);
    return lines.join("\n");
  }

  if (r.alertLevel && Array.isArray(r.checks) && r.mint) {
    const lines = [`🔒 *Security Audit* — \`${String(r.mint).slice(0, 8)}…\``];
    lines.push(`Alert: *${String(r.alertLevel).toUpperCase()}*`);
    if (r.alertMessage) lines.push(String(r.alertMessage));
    (r.checks as Array<{ name?: string; status?: string; detail?: string }>).slice(0, 8).forEach((c) => {
      const icon = c.status === "pass" ? "✅" : c.status === "fail" ? "❌" : "⚠️";
      lines.push(`${icon} ${c.name}: ${c.detail}`);
    });
    if (r.suggestAlert) lines.push("", "_Consider setting a price/rug alert via the agent._");
    return lines.join("\n");
  }

  if (r.programId && r.health) {
    const lines = [`🚀 *Program Monitor* — \`${String(r.programId).slice(0, 8)}…\``];
    lines.push(`Health: *${String(r.health)}*`);
    lines.push(`Executable: ${r.executable ? "yes" : "no"}`);
    if (typeof r.solBalance === "number") lines.push(`Balance: ${r.solBalance} SOL`);
    if (r.upgradeNote) lines.push(String(r.upgradeNote));
    if (r.explorer) lines.push(`[Orb](${String(r.explorer)})`);
    return lines.join("\n");
  }

  if (r.sentimentLabel && Array.isArray(r.headlines)) {
    const lines = [`📰 *Market Sentiment — ${String(r.topic ?? "crypto")}*`];
    lines.push(`Sentiment: *${String(r.sentimentLabel)}* (${r.sentimentScore ?? 0})`);
    if (r.insight) lines.push(String(r.insight));
    if (r.searchSummary) lines.push("", String(r.searchSummary).slice(0, 400));
    lines.push("", "*Headlines:*");
    (r.headlines as Array<{ title?: string; url?: string }>).slice(0, 5).forEach((h, i) => {
      lines.push(`${i + 1}. ${h.title ?? "—"}`);
      if (h.url) lines.push(`   ${h.url}`);
    });
    return lines.join("\n");
  }

  if (r.currentSupply != null && Array.isArray(r.scenarios) && r.mint) {
    const lines = [`🧮 *Tokenomics Sim* — \`${String(r.mint).slice(0, 8)}…\``];
    lines.push(`Current supply: *${Number(r.currentSupply).toLocaleString()}*`);
    (r.scenarios as Array<Record<string, unknown>>).forEach((s) => {
      lines.push(`• ${s.name}: ${s.supply != null ? Number(s.supply).toLocaleString() : ""}${s.finalSupply != null ? ` → ${Number(s.finalSupply).toLocaleString()}` : ""}`);
      if (s.rewardsMinted != null) lines.push(`  Rewards: +${Number(s.rewardsMinted).toLocaleString()}`);
    });
    if (r.note) lines.push("", `_${String(r.note)}_`);
    return lines.join("\n");
  }

  if (typeof r.walletCount === "number" && Array.isArray(r.holdings) && r.totalSol != null) {
    const lines = [`👛 *Multi-Wallet* — ${r.walletCount} wallets`];
    lines.push(`Total: *${Number(r.totalSol).toFixed(4)} SOL*`);
    (r.holdings as Array<{ wallet?: string; sol?: number; ok?: boolean }>).forEach((h) => {
      const short = `${String(h.wallet).slice(0, 4)}…${String(h.wallet).slice(-4)}`;
      lines.push(`• \`${short}\` ${h.ok ? `${Number(h.sol ?? 0).toFixed(4)} SOL` : "error"}`);
    });
    return lines.join("\n");
  }

  if (Array.isArray(r.pools) && r.source === "DefiLlama") {
    const lines = [`🌾 *Yield Optimizer${r.query ? ` — ${r.query}` : ""}*`];
    (r.pools as Array<{ symbol?: string; project?: string; apy?: number; tvlUsd?: number; ilRisk?: string; url?: string | null }>)
      .slice(0, 8)
      .forEach((p, i) => {
        const tvl = p.tvlUsd ? `$${Math.round(p.tvlUsd / 1000)}k TVL` : "";
        lines.push(`${i + 1}. *${p.symbol ?? "?"}* @ ${p.project ?? "?"} — ${p.apy}% APY (${tvl}, IL: ${p.ilRisk ?? "?"})`);
        if (p.url) lines.push(`   [DefiLlama pool](${p.url})`);
      });
    lines.push("_DefiLlama — higher APY = higher risk._");
    return lines.join("\n");
  }

  if (typeof r.totalSol === "number" && Array.isArray(r.holdings) && !r.walletCount) {
    const lines = [`📊 *Portfolio* — ${Number(r.totalSol).toFixed(4)} SOL total`];
    (r.holdings as Array<{ wallet?: string; sol?: number }>).slice(0, 5).forEach((h) => {
      lines.push(`• \`${String(h.wallet).slice(0, 8)}…\` ${Number(h.sol ?? 0).toFixed(4)} SOL`);
    });
    return lines.join("\n");
  }

  if (r.mint && typeof r.priceUsd === "number" && (r.symbol || r.name || r.verdict != null)) {
    return formatTokenCard(r as unknown as TokenCardData);
  }

  if (Array.isArray(r.tokens) && r.tokens.length > 0 && r.source === "DexScreener") {
    const lines = ["🔥 *Trending Solana*"];
    (r.tokens as Array<{ symbol?: string; name?: string; mint?: string; priceUsd?: number; marketCap?: number; change24h?: number; url?: string }>)
      .slice(0, 10)
      .forEach((t, i) => {
        const sym = t.symbol || t.name || "?";
        const price = typeof t.priceUsd === "number" ? `$${t.priceUsd < 0.01 ? t.priceUsd.toFixed(6) : t.priceUsd.toFixed(4)}` : "—";
        const mc =
          typeof t.marketCap === "number" && t.marketCap > 0
            ? ` · MC ${formatUsd(t.marketCap, 0)}`
            : "";
        const chg = typeof t.change24h === "number" ? ` (${t.change24h >= 0 ? "+" : ""}${t.change24h.toFixed(1)}%)` : "";
        lines.push(`${i + 1}. *${sym}* ${price}${mc}${chg}`);
        if (t.mint) lines.push(`   CA: \`${t.mint}\``);
        if (t.url) lines.push(`   [DexScreener](${t.url})`);
      });
    lines.push("_DexScreener — not financial advice._");
    return lines.join("\n");
  }

  if (typeof r.priceUsd === "number" && (r.symbol || r.name)) {
    const sym = String(r.symbol || r.name);
    const lines = [`💰 *${sym}*`, `Price: *${formatUsd(r.priceUsd)}*`];
    if (typeof r.change24h === "number") lines.push(`24h: ${formatPct(r.change24h)}`);
    if (typeof r.liquidityUsd === "number") lines.push(`Liquidity: ${formatUsd(r.liquidityUsd, 0)}`);
    if (r.dexUrl) lines.push(`[DexScreener](${r.dexUrl})`);
    return lines.join("\n");
  }

  if (typeof r.found === "boolean" && typeof r.username === "string") {
    if (!r.found) {
      const billing =
        r.errorKind === "billing" ||
        (typeof r.error === "string" &&
          /402|pay-per-use credits|payment required|usage.capped/i.test(r.error));
      const lines = [`🐦 *X profile @${String(r.username)}*`, ""];

      if (billing) {
        lines.push("*Insufficient X API pay-per-use credits* (error 402).");
        lines.push(
          "Add credits at developer.x.com → your Project → Billing, then try again."
        );
      } else if (typeof r.error === "string") {
        lines.push(`Lookup failed: ${r.error}`);
      } else {
        lines.push("Account not found.");
      }

      if (typeof r.hint === "string") lines.push("", r.hint);
      return lines.join("\n");
    }
    const metrics = (r.metrics ?? {}) as Record<string, number | undefined>;
    const lines = [
      `🐦 *@${String(r.username)}*`,
      r.name ? `Name: *${String(r.name)}*` : "",
      r.description ? `\n${String(r.description).slice(0, 280)}` : "",
      "",
      `Followers: ${metrics.followers_count?.toLocaleString() ?? "—"}`,
      `Following: ${metrics.following_count?.toLocaleString() ?? "—"}`,
      `Posts: ${metrics.tweet_count?.toLocaleString() ?? "—"}`,
      "",
      `https://x.com/${String(r.username)}`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  if (typeof r.query === "string" && (Array.isArray(r.related) || r.summary != null || r.error)) {
    const lines = [`🔍 *Search: ${String(r.query)}*`];
    if (typeof r.summary === "string" && r.summary.trim()) {
      lines.push("", r.summary.trim());
      if (typeof r.sourceUrl === "string" && r.sourceUrl.trim()) {
        lines.push(`[Source](${r.sourceUrl})`);
      }
    }
    const related = Array.isArray(r.related)
      ? (r.related as Array<{ title?: string; url?: string; snippet?: string }>)
      : [];
    if (related.length > 0) {
      lines.push("", "*Results:*");
      related.slice(0, 8).forEach((item, index) => {
        lines.push(`${index + 1}. *${item.title || "Link"}*`);
        if (item.url) lines.push(`   ${item.url}`);
        if (item.snippet) lines.push(`   ${item.snippet.slice(0, 180)}`);
      });
    }
    if (r.ok === false && typeof r.error === "string") {
      lines.push("", `⚠️ ${r.error}`);
    }
    if (lines.length > 1) return lines.join("\n");
  }

  if (typeof r.briefing === "string" && r.briefing.trim()) {
    return r.briefing.slice(0, 3000);
  }

  if (typeof r.content === "string" && r.content.trim()) {
    return r.content.slice(0, 3000);
  }

  if (typeof r.output === "string" && r.output.trim()) {
    return r.output.slice(0, 3000);
  }

  if (typeof r.message === "string" && r.message.trim()) {
    return r.message.slice(0, 3000);
  }

  if (Array.isArray(r.tasks) && r.tasks.length > 0 && r.ok === true && r.count != null) {
    const lines = ["🧠 *Brain tasks*"];
    (r.tasks as Array<{ type?: string; title?: string; scheduledAt?: string; status?: string }>)
      .slice(0, 12)
      .forEach((t, i) => {
        lines.push(
          `${i + 1}. [${t.type || "?"}] ${t.title || "Task"} — ${t.scheduledAt?.slice(0, 16) || "?"}`
        );
      });
    return lines.join("\n");
  }

  if (Array.isArray(r.results) && r.results.length > 0) {
    return (r.results as Array<{ title?: string; snippet?: string }>)
      .slice(0, 5)
      .map((item, i) => `${i + 1}. ${item.title || "Result"}\n${item.snippet || ""}`)
      .join("\n\n");
  }

  return null;
}

export function formatToolResultsFromMessages(messages: OpenRouterMessage[]): string | null {
  const toolMessages = messages.filter((m) => m.role === "tool" && m.content);
  if (toolMessages.length === 0) return null;

  for (let i = toolMessages.length - 1; i >= 0; i--) {
    const formatted = formatToolResult(
      parseToolContent(messageContentToString(toolMessages[i].content))
    );
    if (formatted) return formatted;
  }

  return null;
}
