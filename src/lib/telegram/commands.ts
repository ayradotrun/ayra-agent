/** Telegram bot command menu + help text (shared by handler & dashboard) */

import {
  formatSkillCommandsHelp,
  getTelegramSkillMenuCommands,
  TELEGRAM_SKILL_COMMANDS,
} from "./skill-commands";

export { getTelegramSkillMenuCommands };

export const META_COMMANDS_UI = [
  { cmd: "/post [text]", desc: "🐦 Post to X (auto-post must be on)" },
  { cmd: "/help", desc: "📋 All commands" },
  { cmd: "/agents", desc: "🤖 List agents" },
  { cmd: "/use [name]", desc: "🔄 Switch agent" },
  { cmd: "/status", desc: "📊 Agent + models" },
  { cmd: "/tasks", desc: "📅 Pending brain tasks" },
  { cmd: "/image [prompt]", desc: "🎨 Generate image" },
] as const;

export const TELEGRAM_BOT_COMMANDS = [
  { command: "help", description: "📋 All commands" },
  ...TELEGRAM_SKILL_COMMANDS.map((c) => ({
    command: c.command,
    description: c.description,
  })),
  { command: "agents", description: "🤖 List agents" },
  { command: "use", description: "🔄 Switch agent" },
  { command: "status", description: "📊 Agent status" },
  { command: "tasks", description: "📅 Brain task queue" },
  { command: "post", description: "🐦 Post tweet to X" },
  { command: "image", description: "🎨 Generate image" },
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

  return merged;
}

const CHAT_HELP_META = `Agent: 🤖 /agents · 🔄 /use · 📊 /status · 📅 /tasks · 🎨 /image
💡 Paste a CA mint, or /p [token|CA]`;

const TELEGRAM_HELP_META = `*Agent:* 🤖 /agents · 🔄 /use · 📊 /status · 📅 /tasks · 🎨 /image
_💡 Paste a CA mint, or /p \\[token|CA\\]_`;

export const CHAT_HELP_TEXT = `${formatSkillCommandsHelp("plain")}

${CHAT_HELP_META}`;

export const TELEGRAM_HELP_TEXT = `${formatSkillCommandsHelp("telegram")}

${TELEGRAM_HELP_META}`;

export const CHAT_COMMAND_HINTS = [
  "/post",
  "/help",
  "/p",
  "/t",
  "/q",
  "/ayrascan",
  "/trending",
  "/w",
  "/rug",
  "/f",
] as const;

const SKILL_COMMANDS_UI = TELEGRAM_SKILL_COMMANDS.map((c) => ({
  cmd: c.usage,
  desc: c.description,
}));

export const TELEGRAM_COMMANDS_UI: Array<{ cmd: string; desc: string }> = [
  ...SKILL_COMMANDS_UI,
  ...META_COMMANDS_UI.map((c) => ({ cmd: c.cmd, desc: c.desc })),
];
