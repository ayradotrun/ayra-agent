import type { OpenRouterMessage } from "@/lib/openrouter";
import { messageContentToString } from "@/lib/openrouter";
import { formatTokenCard, type TokenCardData } from "@/lib/agent/token-card";
import { formatMemeScanResults, formatAyraQualityReport, type MemeTokenSnapshot } from "@/lib/agent/meme-quality";

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

export interface FormatToolResultContext {
  agentName?: string;
  skillSlug?: string;
}

export function formatToolResult(data: unknown, context?: FormatToolResultContext): string | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;

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

  if (typeof r.solBalance === "number" && r.wallet) {
    const lines = [
      `👛 *Wallet*`,
      `\`${String(r.wallet)}\``,
      `SOL: *${Number(r.solBalance).toFixed(4)}*`,
    ];
    if (typeof r.tokenCount === "number") lines.push(`SPL tokens: ${r.tokenCount}`);
    if (Array.isArray(r.tokens) && r.tokens.length > 0) {
      lines.push("", "*Top holdings:*");
      (r.tokens as Array<{ symbol?: string; amount?: number }>).slice(0, 5).forEach((t) => {
        lines.push(`• ${t.symbol || "?"}: ${t.amount ?? "?"}`);
      });
    }
    return lines.join("\n");
  }

  if (typeof r.totalSol === "number" && Array.isArray(r.holdings)) {
    const lines = [`📊 *Portfolio* — ${Number(r.totalSol).toFixed(4)} SOL total`];
    (r.holdings as Array<{ wallet?: string; sol?: number }>).slice(0, 5).forEach((h) => {
      lines.push(`• \`${String(h.wallet).slice(0, 8)}…\` ${Number(h.sol ?? 0).toFixed(4)} SOL`);
    });
    return lines.join("\n");
  }

  if (r.mint && typeof r.priceUsd === "number" && (r.symbol || r.name || r.verdict != null)) {
    return formatTokenCard(r as unknown as TokenCardData);
  }

  if (Array.isArray(r.tokens) && r.tokens.length > 0) {
    const lines = ["🔥 *Trending Solana*"];
    (r.tokens as Array<{ symbol?: string; name?: string; priceUsd?: number; change24h?: number; url?: string }>)
      .slice(0, 10)
      .forEach((t, i) => {
        const sym = t.symbol || t.name || "?";
        const price = typeof t.priceUsd === "number" ? `$${t.priceUsd < 0.01 ? t.priceUsd.toFixed(6) : t.priceUsd.toFixed(4)}` : "—";
        const chg = typeof t.change24h === "number" ? ` (${t.change24h >= 0 ? "+" : ""}${t.change24h.toFixed(1)}%)` : "";
        lines.push(`${i + 1}. *${sym}* ${price}${chg}`);
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
