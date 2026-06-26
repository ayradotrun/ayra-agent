import { isSolanaMint } from "@/lib/agent/token-card";
import { QUALITY_MAX_PAIR_AGE_HOURS } from "@/lib/agent/meme-quality";

const WALLET_OR_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,50}$/;

export type SkillCommandArg =
  | "none"
  | "wallet"
  | "mint"
  | "ticker"
  | "query"
  | "url"
  | "domain"
  | "username";

export interface TelegramSkillCommandDef {
  command: string;
  aliases?: string[];
  skillSlug: string;
  description: string;
  usage: string;
  arg: SkillCommandArg;
  defaults?: Record<string, unknown>;
}

export const TELEGRAM_SKILL_COMMANDS: TelegramSkillCommandDef[] = [
  {
    command: "p",
    aliases: ["price"],
    skillSlug: "token-quick-lookup",
    description: "💰 Token price",
    usage: "/p [token|CA]",
    arg: "ticker",
  },
  {
    command: "t",
    aliases: ["token"],
    skillSlug: "token-quick-lookup",
    description: "🪙 Token info + safety",
    usage: "/t [token|CA]",
    arg: "ticker",
  },
  {
    command: "w",
    aliases: ["wallet"],
    skillSlug: "wallet-tracker",
    description: "👛 Wallet balance",
    usage: "/w [address]",
    arg: "wallet",
  },
  {
    command: "n",
    aliases: ["networth", "nw"],
    skillSlug: "wallet-networth",
    description: "💎 Wallet net worth",
    usage: "/n [address]",
    arg: "wallet",
  },
  {
    command: "whale",
    aliases: ["wh"],
    skillSlug: "whale-tracker",
    description: "🐋 Whale check",
    usage: "/whale [address]",
    arg: "wallet",
  },
  {
    command: "q",
    aliases: ["quality"],
    skillSlug: "token-quality-report",
    description: "✅ AYRA quality + buy/skip verdict (max pair 7d)",
    usage: "/q [CA]",
    arg: "mint",
    defaults: { maxPairAgeHours: QUALITY_MAX_PAIR_AGE_HOURS },
  },
  {
    command: "rug",
    aliases: ["rugcheck", "r"],
    skillSlug: "rugcheck",
    description: "🛡️ Rug check",
    usage: "/rug [CA]",
    arg: "mint",
  },
  {
    command: "f",
    aliases: ["find"],
    skillSlug: "token-finder",
    description: "🔍 Find token by name",
    usage: "/f [name]",
    arg: "query",
  },
  {
    command: "mintinfo",
    aliases: ["mi"],
    skillSlug: "token-tracker",
    description: "📋 On-chain mint info",
    usage: "/mintinfo [CA]",
    arg: "mint",
  },
  {
    command: "ayrascan",
    aliases: ["y", "scan"],
    skillSlug: "meme-coin-scanner",
    description: "🌿 AYRA meme scan",
    usage: "/ayrascan",
    arg: "none",
    defaults: { limit: 8 },
  },
  {
    command: "trending",
    aliases: ["tr"],
    skillSlug: "trending-tokens",
    description: "📈 Trending tokens",
    usage: "/trending",
    arg: "none",
  },
  {
    command: "network",
    skillSlug: "network-stats",
    description: "🌐 Network stats",
    usage: "/network",
    arg: "none",
  },
  {
    command: "sns",
    skillSlug: "sns-resolver",
    description: "🔗 Resolve .sol domain",
    usage: "/sns [name]",
    arg: "domain",
  },
  {
    command: "search",
    skillSlug: "web-search",
    description: "🔎 Web search",
    usage: "/search [query]",
    arg: "query",
  },
  {
    command: "x",
    aliases: ["xuser", "twitter"],
    skillSlug: "x-profile-lookup",
    description: "🐦 X profile lookup (requires pay-per-use credits on developer.x.com)",
    usage: "/x [@username]",
    arg: "username",
  },
  {
    command: "rpc",
    skillSlug: "solana-rpc-monitor",
    description: "⚡ RPC health",
    usage: "/rpc",
    arg: "none",
  },
];

const COMMAND_MAP = new Map<string, TelegramSkillCommandDef>();
for (const def of TELEGRAM_SKILL_COMMANDS) {
  COMMAND_MAP.set(def.command, def);
  for (const alias of def.aliases ?? []) {
    COMMAND_MAP.set(alias, def);
  }
}

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
        return { error: `Usage: ${def.usage}` };
      }
      input.wallet = args;
      break;
    case "mint":
      if (!args || !isSolanaMint(args)) {
        return { error: `Usage: ${def.usage}` };
      }
      input.mint = args;
      break;
    case "ticker":
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
    case "username":
      if (!args) return { error: `Usage: ${def.usage}` };
      input.username = args.replace(/^@/, "");
      break;
  }

  return { def, input };
}

const TOOL_COMMANDS = new Set(["search", "rpc", "x"]);

export function formatSkillCommandsHelp(format: "telegram" | "plain" = "telegram"): string {
  const crypto = TELEGRAM_SKILL_COMMANDS.filter((c) => !TOOL_COMMANDS.has(c.command));
  const tools = TELEGRAM_SKILL_COMMANDS.filter((c) => TOOL_COMMANDS.has(c.command));

  const fmt = (c: TelegramSkillCommandDef) => `${c.usage} — ${c.description}`;
  const lines: string[] = format === "plain" ? ["Skill commands", ""] : ["*Skill commands*", ""];

  lines.push(format === "plain" ? "Crypto" : "*Crypto*");
  lines.push(...crypto.map(fmt));
  lines.push("");
  lines.push(format === "plain" ? "Tools" : "*Tools*");
  lines.push(...tools.map(fmt));
  lines.push("");
  lines.push(
    format === "plain"
      ? "💡 Paste a CA mint, or /p [token|CA] — also works for SOL & Jupiter price."
      : "_💡 Paste a CA mint, or /p \\[token|CA\\] — also works for SOL & Jupiter price._"
  );

  return lines.join("\n");
}

export function getTelegramSkillMenuCommands(): Array<{ command: string; description: string }> {
  return TELEGRAM_SKILL_COMMANDS.map((c) => ({
    command: c.command,
    description: c.description.slice(0, 256),
  }));
}
