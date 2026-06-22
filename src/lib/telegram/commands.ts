/** Telegram bot command menu + help text (shared by handler & dashboard) */

import { getTelegramSkillMenuCommands } from "./skill-commands";

export const TELEGRAM_BOT_COMMANDS = [
  { command: "help", description: "Show all commands" },
  { command: "skills", description: "List skill slash commands" },
  { command: "price", description: "Token price by ticker or CA" },
  { command: "token", description: "Full token info + safety" },
  { command: "wallet", description: "Wallet SOL + SPL balance" },
  { command: "quality", description: "AYRA quality report for CA" },
  { command: "rugcheck", description: "Rug risk score for CA" },
  { command: "ayrascan", description: "AYRA scan — filtered meme coins" },
  { command: "trending", description: "Hot Solana tokens" },
  { command: "sol", description: "SOL price" },
  { command: "networth", description: "Wallet USD net worth" },
  { command: "find", description: "Search token by name" },
  { command: "network", description: "Solana network stats" },
  { command: "agents", description: "List your agents" },
  { command: "use", description: "Set default agent" },
  { command: "status", description: "Agent + chat/image models" },
  { command: "image", description: "Generate image: /image [prompt]" },
] as const;

export function getAllTelegramBotCommands(): Array<{ command: string; description: string }> {
  const seen = new Set<string>();
  const merged: Array<{ command: string; description: string }> = [];

  for (const c of TELEGRAM_BOT_COMMANDS) {
    if (seen.has(c.command)) continue;
    seen.add(c.command);
    merged.push({ command: c.command, description: c.description });
  }

  for (const c of getTelegramSkillMenuCommands()) {
    if (seen.has(c.command)) continue;
    seen.add(c.command);
    merged.push(c);
  }

  return merged.slice(0, 100);
}

export const TELEGRAM_HELP_TEXT = `*AYRA Agent* — Telegram

*Skill commands* (instant, no LLM)
/price \\[ticker|CA\\] — token price
/token \\[ticker|CA\\] — full info + safety
/wallet \\[address\\] — SOL + SPL balance
/networth \\[address\\] — wallet USD value
/quality \\[CA\\] — AYRA quality report
/rugcheck \\[CA\\] — rug risk score
/ayrascan — AYRA scan (filtered meme coins)
/trending — hot Solana tokens
/sol — SOL price
/find \\[name\\] — search token
/whale \\[address\\] — whale check
/network — Solana TPS & epoch
/sns \\[name\\] — resolve .sol domain

/skills — full command list

*Quick text* (no slash)
• paste CA mint — token info
• \`price bonk\` — ticker lookup
• \`ayra scan\` — same as /ayrascan

*Agent*
/agents · /use \\[name\\] · /status

*Image*
/image \\[prompt\\]

/help — this message`;

export const TELEGRAM_COMMANDS_UI: Array<{ cmd: string; desc: string }> = [
  { cmd: "/help", desc: "Show all commands" },
  { cmd: "/skills", desc: "List all skill commands" },
  { cmd: "/price [ticker|CA]", desc: "Token price" },
  { cmd: "/token [ticker|CA]", desc: "Full token card" },
  { cmd: "/wallet [address]", desc: "Wallet balance" },
  { cmd: "/quality [CA]", desc: "AYRA quality report" },
  { cmd: "/rugcheck [CA]", desc: "Rug check" },
  { cmd: "/ayrascan", desc: "AYRA scan — filtered meme coins" },
  { cmd: "/trending", desc: "Trending tokens" },
  { cmd: "/sol", desc: "SOL price" },
  { cmd: "/agents", desc: "List your agents" },
  { cmd: "/use [name]", desc: "Set default agent" },
  { cmd: "/status", desc: "Agent + models" },
  { cmd: "/image [prompt]", desc: "Generate image" },
];
