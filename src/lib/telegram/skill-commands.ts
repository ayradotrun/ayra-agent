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
  | "username"
  | "multi_wallet"
  | "optional_query"
  | "program"
  | "sim";

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
    aliases: ["wallet", "analyze"],
    skillSlug: "wallet-tracker",
    description: "🕵️ Wallet analyzer (balance + funding + bundle)",
    usage: "/w [address] [token_CA]",
    arg: "wallet",
  },
  {
    command: "n",
    aliases: ["network"],
    skillSlug: "network-stats",
    description: "🌐 Network status (TPS, epoch)",
    usage: "/n",
    arg: "none",
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
    description: "📈 Trending tokens + MC",
    usage: "/trending",
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
  {
    command: "audit",
    aliases: ["sec"],
    skillSlug: "security-audit",
    description: "🔒 Security audit + alert level",
    usage: "/audit [CA]",
    arg: "mint",
  },
  {
    command: "prog",
    skillSlug: "program-monitor",
    description: "🚀 Program deploy health",
    usage: "/prog [program_id]",
    arg: "program",
  },
  {
    command: "news",
    aliases: ["sent"],
    skillSlug: "market-sentiment",
    description: "📰 News + market sentiment",
    usage: "/news [topic]",
    arg: "optional_query",
  },
  {
    command: "sim",
    skillSlug: "tokenomics-sim",
    description: "🧮 Tokenomics simulator",
    usage: "/sim [CA]",
    arg: "sim",
  },
  {
    command: "yield",
    aliases: ["yld"],
    skillSlug: "yield-optimizer",
    description: "🌾 DeFi yield compare",
    usage: "/yield [token]",
    arg: "optional_query",
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
      if (!args) return { error: `Usage: ${def.usage}` };
      {
        const parts = args.trim().split(/\s+/);
        if (!parts[0] || !WALLET_OR_MINT.test(parts[0])) {
          return { error: `Usage: ${def.usage}` };
        }
        input.wallet = parts[0];
        if (parts[1] && isSolanaMint(parts[1])) {
          input.mint = parts[1];
        } else if (parts[1]) {
          return { error: `Usage: ${def.usage}` };
        }
      }
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
    case "program":
      if (!args || !WALLET_OR_MINT.test(args.trim())) {
        return { error: `Usage: ${def.usage}` };
      }
      input.programId = args.trim();
      break;
    case "optional_query":
      if (args) input.query = args;
      if (def.skillSlug === "market-sentiment" && args) input.topic = args;
      break;
    case "multi_wallet": {
      if (!args) return { error: `Usage: ${def.usage}` };
      const parts = args.split(/[\s,]+/).filter(Boolean);
      const wallets = parts.filter((p) => WALLET_OR_MINT.test(p));
      if (wallets.length === 0) return { error: `Usage: ${def.usage}` };
      if (wallets.length > 10) return { error: "Max 10 wallets per request." };
      input.wallets = wallets;
      break;
    }
    case "sim": {
      if (!args) return { error: `Usage: ${def.usage}` };
      const parts = args.trim().split(/\s+/);
      const mint = parts[0];
      if (!isSolanaMint(mint)) return { error: `Usage: ${def.usage}` };
      input.mint = mint;
      for (const p of parts.slice(1)) {
        const [k, v] = p.split("=");
        const num = Number(v);
        if (!Number.isFinite(num)) continue;
        if (k === "burn") input.burnPct = num;
        else if (k === "stake") input.stakeApr = num;
        else if (k === "ratio") input.stakeRatio = num;
        else if (k === "months") input.months = num;
      }
      break;
    }
  }

  return { def, input };
}

const TOOL_COMMANDS = new Set(["search", "rpc", "x", "news", "sent"]);

export function formatSkillCommandsHelp(format: "telegram" | "plain" = "telegram"): string {
  const crypto = TELEGRAM_SKILL_COMMANDS.filter((c) => !TOOL_COMMANDS.has(c.command));
  const tools = TELEGRAM_SKILL_COMMANDS.filter((c) => TOOL_COMMANDS.has(c.command));

  const bold = (s: string) => (format === "plain" ? s : `*${s}*`);
  const dim = (s: string) => (format === "plain" ? s : `_${s}_`);

  const fmt = (c: TelegramSkillCommandDef) => {
    const alias =
      c.aliases && c.aliases.length > 0
        ? dim(` · also /${c.aliases.join(", /")}`)
        : "";
    return `${c.usage}\n${c.description}${alias}`;
  };

  const lines: string[] = [
    bold("⚡ AYRA skill commands"),
    "",
    bold("💎 Crypto"),
    ...crypto.map(fmt),
    "",
    bold("🛠 Tools"),
    ...tools.map(fmt),
    "",
    dim("💡 Paste a Solana CA mint, or /p [token|CA] for instant price + safety."),
  ];

  return lines.join("\n");
}

export function getTelegramSkillMenuCommands(): Array<{ command: string; description: string }> {
  return TELEGRAM_SKILL_COMMANDS.map((c) => ({
    command: c.command,
    description: c.description.slice(0, 256),
  }));
}
