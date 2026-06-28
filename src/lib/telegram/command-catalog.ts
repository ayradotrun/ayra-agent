import {
  AGENT_META_COMMANDS_UI,
  MODEL_COMMANDS_UI,
} from "./commands";
import { TELEGRAM_SKILL_COMMANDS } from "./skill-commands";

const TOOL_COMMANDS = new Set(["search", "rpc", "x", "news", "sent"]);

export type SlashCommandCategory = "crypto" | "tools" | "agent" | "model";

export interface SlashCommandItem {
  command: string;
  usage: string;
  description: string;
  category: SlashCommandCategory;
  aliases?: string[];
  /** Text inserted into chat input when picked */
  insert: string;
}

const CATEGORY_LABELS: Record<SlashCommandCategory, string> = {
  crypto: "Crypto",
  tools: "Tools",
  agent: "Agent",
  model: "Models",
};

export function getSlashCommandCategoryLabel(category: SlashCommandCategory): string {
  return CATEGORY_LABELS[category];
}

function insertForUsage(usage: string): string {
  const base = usage.split(" [")[0];
  return base.endsWith(" ") ? base : `${base} `;
}

let catalogCache: SlashCommandItem[] | null = null;

export function getSlashCommandCatalog(): SlashCommandItem[] {
  if (catalogCache) return catalogCache;

  const skills: SlashCommandItem[] = TELEGRAM_SKILL_COMMANDS.map((c) => ({
    command: c.command,
    usage: c.usage,
    description: c.description,
    category: TOOL_COMMANDS.has(c.command) ? "tools" : "crypto",
    aliases: c.aliases,
    insert: insertForUsage(c.usage),
  }));

  const agent: SlashCommandItem[] = AGENT_META_COMMANDS_UI.map((c) => ({
    command: c.cmd.replace(/^\//, "").split(" ")[0],
    usage: c.cmd,
    description: c.desc,
    category: "agent",
    insert: insertForUsage(c.cmd),
  }));

  const model: SlashCommandItem[] = MODEL_COMMANDS_UI.map((c) => ({
    command: c.cmd.replace(/^\//, "").split(" ")[0],
    usage: c.cmd,
    description: c.desc,
    category: "model",
    insert: insertForUsage(c.cmd),
  }));

  catalogCache = [...skills, ...agent, ...model];
  return catalogCache;
}

/** Show picker while user is typing a command name (before arguments). */
export function shouldShowSlashCommandMenu(input: string): boolean {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith("/")) return false;
  const body = trimmed.slice(1);
  if (!body) return true;
  return !body.includes(" ");
}

export function filterSlashCommands(input: string): SlashCommandItem[] {
  const trimmed = input.trimStart();
  if (!trimmed.startsWith("/")) return [];

  const query = trimmed.slice(1).split(/\s+/)[0]?.toLowerCase() ?? "";
  const all = getSlashCommandCatalog();

  if (!query) return all;

  return all.filter((item) => {
    if (item.command.toLowerCase().startsWith(query)) return true;
    if (item.usage.toLowerCase().includes(`/${query}`)) return true;
    return item.aliases?.some((a) => a.toLowerCase().startsWith(query)) ?? false;
  });
}

export function groupSlashCommands(
  items: SlashCommandItem[]
): Array<{ category: SlashCommandCategory; label: string; items: SlashCommandItem[] }> {
  const order: SlashCommandCategory[] = ["crypto", "tools", "agent", "model"];
  const map = new Map<SlashCommandCategory, SlashCommandItem[]>();

  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }

  return order
    .filter((cat) => (map.get(cat)?.length ?? 0) > 0)
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: map.get(cat)!,
    }));
}

/** Top commands for empty-state chips */
export const CHAT_QUICK_COMMANDS: SlashCommandItem[] = [
  "help",
  "p",
  "w",
  "q",
  "ayrascan",
  "trending",
  "search",
  "status",
  "image",
]
  .map((name) => getSlashCommandCatalog().find((c) => c.command === name))
  .filter((c): c is SlashCommandItem => !!c);
