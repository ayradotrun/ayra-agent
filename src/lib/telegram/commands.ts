/** Telegram bot command menu + help text (shared by handler & dashboard) */

import {
  formatSkillCommandsHelp,
  getTelegramSkillMenuCommands,
  TELEGRAM_SKILL_COMMANDS,
} from "./skill-commands";

export { getTelegramSkillMenuCommands };

export const AGENT_META_COMMANDS_UI = [
  { cmd: "/help", desc: "📋 All commands (same as /start)" },
  { cmd: "/agents", desc: "🤖 List your agents" },
  { cmd: "/use [name]", desc: "🔄 Switch active agent" },
  { cmd: "/status", desc: "📊 Agent + models + account" },
  { cmd: "/tasks", desc: "📅 Pending brain tasks" },
  { cmd: "/post [text]", desc: "🐦 Post to X (auto-post must be on)" },
  { cmd: "/image [prompt]", desc: "🎨 Generate image" },
] as const;

export const MODEL_COMMANDS_UI = [
  { cmd: "/model [name]", desc: "🧠 Switch chat model" },
  { cmd: "/models", desc: "📃 List chat + image models" },
  { cmd: "/models chat", desc: "📃 List chat models only" },
  { cmd: "/models image", desc: "📃 List image models only" },
  { cmd: "/custommodel [id]", desc: "🧠 Set custom chat model (provider/model)" },
  { cmd: "/imagemodel [name]", desc: "🖼️ Switch image model" },
  { cmd: "/customimagemodel [id]", desc: "🖼️ Set custom image model" },
] as const;

/** @deprecated use AGENT_META_COMMANDS_UI */
export const META_COMMANDS_UI = AGENT_META_COMMANDS_UI;

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
  { command: "model", description: "🧠 Switch chat model" },
  { command: "models", description: "📃 List models" },
  { command: "imagemodel", description: "🖼️ Switch image model" },
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

function formatMetaCommandsHelp(format: "telegram" | "plain"): string {
  const bold = (s: string) => (format === "plain" ? s : `*${s}*`);
  const dim = (s: string) => (format === "plain" ? s : `_${s}_`);
  const fmt = (cmd: string, desc: string) => `${cmd}\n${desc}`;

  const lines: string[] = [bold("🤖 Agent"), ""];
  for (const c of AGENT_META_COMMANDS_UI) {
    lines.push(fmt(c.cmd, c.desc));
  }

  lines.push("");
  lines.push(bold("🧠 Models"));
  lines.push("");

  for (const c of MODEL_COMMANDS_UI) {
    lines.push(fmt(c.cmd, c.desc));
  }

  lines.push("");
  lines.push(dim("💡 Paste a Solana CA mint for a quick lookup, or /p [token|CA]."));

  return lines.join("\n");
}

export const CHAT_HELP_TEXT = `${formatSkillCommandsHelp("plain")}

${formatMetaCommandsHelp("plain")}`;

export const TELEGRAM_HELP_TEXT = `${formatSkillCommandsHelp("telegram")}

${formatMetaCommandsHelp("telegram")}`;

/** @deprecated use CHAT_QUICK_COMMANDS from command-catalog */
export const CHAT_COMMAND_HINTS = [
  "/help",
  "/p",
  "/w",
  "/q",
  "/ayrascan",
  "/trending",
  "/search",
  "/status",
  "/image",
] as const;

const SKILL_COMMANDS_UI = TELEGRAM_SKILL_COMMANDS.map((c) => ({
  cmd: c.usage,
  desc: c.description,
}));

export { SKILL_COMMANDS_UI };

export const TELEGRAM_COMMANDS_UI: Array<{ cmd: string; desc: string }> = [
  ...SKILL_COMMANDS_UI,
  ...AGENT_META_COMMANDS_UI.map((c) => ({ cmd: c.cmd, desc: c.desc })),
  ...MODEL_COMMANDS_UI.map((c) => ({ cmd: c.cmd, desc: c.desc })),
];
