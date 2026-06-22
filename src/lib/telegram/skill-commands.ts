import { isSolanaMint } from "@/lib/agent/token-card";

const WALLET_OR_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,50}$/;

export type SkillCommandArg =
  | "none"
  | "wallet"
  | "mint"
  | "ticker"
  | "query"
  | "url"
  | "domain";

export interface TelegramSkillCommandDef {
  command: string;
  skillSlug: string;
  description: string;
  usage: string;
  arg: SkillCommandArg;
  defaults?: Record<string, unknown>;
}

export const TELEGRAM_SKILL_COMMANDS: TelegramSkillCommandDef[] = [
  { command: "price", skillSlug: "token-quick-lookup", description: "Token price by ticker or CA", usage: "/price [ticker|CA]", arg: "ticker" },
  { command: "token", skillSlug: "token-quick-lookup", description: "Full token info + safety", usage: "/token [ticker|CA]", arg: "ticker" },
  { command: "wallet", skillSlug: "wallet-tracker", description: "SOL + SPL balance", usage: "/wallet [address]", arg: "wallet" },
  { command: "networth", skillSlug: "wallet-networth", description: "Wallet USD net worth", usage: "/networth [address]", arg: "wallet" },
  { command: "whale", skillSlug: "whale-tracker", description: "Whale wallet check", usage: "/whale [address]", arg: "wallet" },
  { command: "portfolio", skillSlug: "portfolio-tracker", description: "Portfolio summary", usage: "/portfolio [address]", arg: "wallet", defaults: {} },
  { command: "quality", skillSlug: "token-quality-report", description: "AYRA quality report for CA", usage: "/quality [CA]", arg: "mint" },
  { command: "rugcheck", skillSlug: "rugcheck", description: "Rug risk score", usage: "/rugcheck [CA]", arg: "mint" },
  { command: "jupiter", skillSlug: "jupiter-price", description: "Jupiter USD price", usage: "/jupiter [CA]", arg: "mint" },
  { command: "mintinfo", skillSlug: "token-tracker", description: "On-chain mint info", usage: "/mintinfo [CA]", arg: "mint" },
  { command: "find", skillSlug: "token-finder", description: "Search token by name", usage: "/find [query]", arg: "query" },
  { command: "ayrascan", skillSlug: "meme-coin-scanner", description: "AYRA scan — filtered meme coins", usage: "/ayrascan", arg: "none", defaults: { limit: 8 } },
  { command: "memescan", skillSlug: "meme-coin-scanner", description: "Alias for /ayrascan", usage: "/ayrascan", arg: "none", defaults: { limit: 8 } },
  { command: "trending", skillSlug: "trending-tokens", description: "Hot Solana tokens", usage: "/trending", arg: "none" },
  { command: "sol", skillSlug: "sol-price-checker", description: "SOL price", usage: "/sol", arg: "none" },
  { command: "network", skillSlug: "network-stats", description: "Solana TPS & epoch", usage: "/network", arg: "none" },
  { command: "sns", skillSlug: "sns-resolver", description: "Resolve .sol domain", usage: "/sns [name]", arg: "domain" },
  { command: "dex", skillSlug: "dex-monitor", description: "DexScreener pair", usage: "/dex [CA]", arg: "mint" },
  { command: "rpc", skillSlug: "solana-rpc-monitor", description: "Solana RPC health", usage: "/rpc", arg: "none" },
  { command: "search", skillSlug: "web-search", description: "Web search", usage: "/search [query]", arg: "query" },
  { command: "rss", skillSlug: "rss-reader", description: "Read RSS feed", usage: "/rss [url]", arg: "url" },
  { command: "health", skillSlug: "website-health-check", description: "Website uptime check", usage: "/health [url]", arg: "url" },
  { command: "memory", skillSlug: "memory-search", description: "Search agent memory", usage: "/memory [query]", arg: "query" },
];

const COMMAND_MAP = new Map(TELEGRAM_SKILL_COMMANDS.map((c) => [c.command, c]));

export function parseSkillCommand(
  text: string
): { def: TelegramSkillCommandDef; input: Record<string, unknown> } | { error: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;

  const body = trimmed.slice(1);
  const space = body.indexOf(" ");
  const cmdName = (space === -1 ? body : body.slice(0, space)).toLowerCase().split("@")[0];
  const args = space === -1 ? "" : body.slice(space + 1).trim();

  const def = COMMAND_MAP.get(cmdName);
  if (!def) return null;

  const input: Record<string, unknown> = { ...(def.defaults ?? {}) };

  switch (def.arg) {
    case "none":
      if (args) return { error: `Usage: ${def.usage}` };
      break;
    case "wallet":
      if (!args || !WALLET_OR_MINT.test(args)) {
        return { error: `Usage: ${def.usage}\n_Paste a valid Solana wallet address._` };
      }
      input.wallet = args;
      break;
    case "mint":
      if (!args || !isSolanaMint(args)) {
        return { error: `Usage: ${def.usage}\n_Paste a valid token CA (mint address)._` };
      }
      input.mint = args;
      break;
    case "ticker":
      if (!args) return { error: `Usage: ${def.usage}` };
      input.query = args;
      break;
    case "query":
      if (!args) return { error: `Usage: ${def.usage}` };
      input.query = args;
      break;
    case "url":
      if (!args) return { error: `Usage: ${def.usage}` };
      if (def.skillSlug === "rss-reader") input.feedUrl = args;
      else input.url = args;
      break;
    case "domain":
      if (!args) return { error: `Usage: ${def.usage}` };
      input.domain = args.replace(/\.sol$/i, "");
      break;
  }

  if (def.skillSlug === "portfolio-tracker" && typeof input.wallet === "string") {
    input.wallets = [input.wallet];
    delete input.wallet;
  }

  return { def, input };
}

export function formatSkillCommandsHelp(format: "telegram" | "plain" = "telegram"): string {
  const cryptoCmds = TELEGRAM_SKILL_COMMANDS.filter((x) =>
    [
      "price",
      "token",
      "wallet",
      "networth",
      "whale",
      "portfolio",
      "quality",
      "rugcheck",
      "jupiter",
      "mintinfo",
      "find",
      "ayrascan",
      "trending",
      "sol",
      "network",
      "sns",
      "dex",
      "rpc",
    ].includes(x.command)
  );
  const toolCmds = TELEGRAM_SKILL_COMMANDS.filter((x) =>
    ["search", "rss", "health", "memory"].includes(x.command)
  );

  if (format === "plain") {
    const lines = ["Skill commands", ""];
    lines.push("Crypto");
    for (const c of cryptoCmds) {
      lines.push(`/${c.command} — ${c.description}`);
      lines.push(`  ${c.usage}`);
    }
    lines.push("", "Research & tools");
    for (const c of toolCmds) {
      lines.push(`/${c.command} — ${c.description}`);
      lines.push(`  ${c.usage}`);
    }
    lines.push("", "Instant — no LLM. Full CA/wallet in replies.");
    return lines.join("\n");
  }

  const lines = ["*Skill commands*", ""];
  lines.push("*Crypto*");
  for (const c of cryptoCmds) {
    lines.push(`/${c.command} — ${c.description}`);
    lines.push(`  _${c.usage}_`);
  }
  lines.push("", "*Research & tools*");
  for (const c of toolCmds) {
    lines.push(`/${c.command} — ${c.description}`);
    lines.push(`  _${c.usage}_`);
  }
  lines.push("", "_Instant — no LLM. Full CA/wallet in replies._");
  return lines.join("\n");
}

export function getTelegramSkillMenuCommands(): Array<{ command: string; description: string }> {
  return TELEGRAM_SKILL_COMMANDS.slice(0, 20).map((c) => ({
    command: c.command,
    description: c.description.slice(0, 256),
  }));
}
