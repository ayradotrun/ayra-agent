import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ALL_SKILL_DEFINITIONS } from "@/lib/skills/catalog";
import {
  DEFAULT_AGENT_PROMPT,
  AYRA_OFFICE_IDENTITY,
  getSystemPromptForTemplate,
} from "@/lib/agent/system-prompts";

export { DEFAULT_AGENT_PROMPT, AYRA_OFFICE_IDENTITY };

/** All marketplace skill slugs — used by the full-capability Ayra template */
export const FULL_AYRA_SKILL_SLUGS = ALL_SKILL_DEFINITIONS.map((s) => s.slug);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "…";
}


export const AGENT_TEMPLATES = [
  {
    id: "aria-research",
    name: "Aria",
    role: "Research Analyst",
    description: "Tracks wallets, token mints, and produces on-chain research briefings for the team.",
    systemPrompt: getSystemPromptForTemplate("aria-research"),
    skills: [
      "wallet-tracker",
      "token-tracker",
      "token-recommendation",
      "dex-monitor",
      "solana-rpc-monitor",
      "web-search",
      "memory-storage",
      "memory-search",
      "telegram-notify",
    ],
    schedule: "EVERY_15_MIN" as const,
    telegramNotify: true,
    autoPostX: false,
  },
  {
    id: "sienna-comms",
    name: "Sienna",
    role: "Communications Lead",
    description: "Drafts X posts and threads, finds trending topics, manages the project's social voice.",
    systemPrompt: getSystemPromptForTemplate("sienna-comms"),
    skills: [
      "x-draft-generator",
      "x-thread-drafter",
      "x-post",
      "x-profile-lookup",
      "x-timeline-reader",
      "viral-topic-finder",
      "reply-generator",
      "content-calendar",
      "engagement-analyzer",
      "memory-storage",
      "telegram-notify",
    ],
    schedule: "HOURLY" as const,
    telegramNotify: true,
    autoPostX: false,
  },
  {
    id: "marcus-network",
    name: "Marcus",
    role: "Network Operations",
    description: "Monitors Solana RPC health, wallet activity, and DEX pairs around the clock.",
    systemPrompt: getSystemPromptForTemplate("marcus-network"),
    skills: [
      "solana-rpc-monitor",
      "wallet-tracker",
      "dex-monitor",
      "new-token-monitor",
      "portfolio-tracker",
      "memory-storage",
      "telegram-notify",
    ],
    schedule: "EVERY_5_MIN" as const,
    telegramNotify: true,
    autoPostX: false,
  },
  {
    id: "nina-infra",
    name: "Nina",
    role: "Infrastructure Monitor",
    description: "Watches websites, SSL certs, server health, and deployment uptime.",
    systemPrompt: getSystemPromptForTemplate("nina-infra"),
    skills: [
      "website-health-check",
      "ssl-monitor",
      "performance-audit",
      "seo-audit",
      "deployment-monitor",
      "vps-monitor",
      "cpu-monitor",
      "ram-monitor",
      "memory-storage",
      "telegram-notify",
    ],
    schedule: "EVERY_15_MIN" as const,
    telegramNotify: true,
    autoPostX: false,
  },
  {
    id: "kai-devrel",
    name: "Kai",
    role: "Developer Relations",
    description: "Analyzes GitHub repos, triages issues, reviews code, and assists the dev team.",
    systemPrompt: getSystemPromptForTemplate("kai-devrel"),
    skills: [
      "github-repo-analyzer",
      "github-reader",
      "issue-assistant",
      "code-review-assistant",
      "error-analyzer",
      "log-reader",
      "documentation-reader",
      "memory-storage",
      "memory-search",
    ],
    schedule: "MANUAL" as const,
    telegramNotify: false,
    autoPostX: false,
  },
  {
    id: "ravi-intelligence",
    name: "Ravi",
    role: "Intelligence Officer",
    description: "Web research, news monitoring, data analysis, and executive reports.",
    systemPrompt: getSystemPromptForTemplate("ravi-intelligence"),
    skills: [
      "web-search",
      "news-monitor",
      "website-scraper",
      "documentation-reader",
      "rss-reader",
      "csv-reader",
      "report-generator",
      "chart-generator",
      "task-planner",
      "database-query",
      "memory-storage",
      "memory-search",
    ],
    schedule: "MANUAL" as const,
    telegramNotify: false,
    autoPostX: false,
  },
  {
    id: "ayra-full",
    name: "Ayra",
    role: "Chief Operations — Full Access",
    description:
      "All skills enabled: token price, wallet tracking, X posts, web monitoring, GitHub, DevOps, and more.",
    systemPrompt: getSystemPromptForTemplate("ayra-full"),
    skills: [...FULL_AYRA_SKILL_SLUGS],
    schedule: "MANUAL" as const,
    telegramNotify: true,
    autoPostX: false,
  },
  {
    id: "nova-ayra",
    name: "Nova",
    role: "AYRA Brain",
    description:
      "Autonomous ops brain — schedules tweets, content calendars, reminders, and multi-step tasks with persistent memory.",
    systemPrompt: getSystemPromptForTemplate("nova-ayra"),
    skills: [
      "brain-task-schedule",
      "brain-task-list",
      "brain-task-cancel",
      "brain-calendar-plan",
      "task-planner",
      "goal-tracker",
      "scheduled-tasks",
      "memory-storage",
      "memory-search",
      "x-draft-generator",
      "x-thread-drafter",
      "x-post",
      "x-profile-lookup",
      "x-timeline-reader",
      "viral-topic-finder",
      "reply-generator",
      "content-calendar",
      "engagement-analyzer",
      "web-search",
      "telegram-notify",
    ],
    schedule: "HOURLY" as const,
    telegramNotify: true,
    autoPostX: false,
  },
  {
    id: "custom",
    name: "New Hire",
    role: "Custom Agent",
    description: "Configure name, skills, and schedule — behavior follows AYRA's locked protocol.",
    systemPrompt: getSystemPromptForTemplate("custom"),
    skills: [],
    schedule: "MANUAL" as const,
    telegramNotify: false,
    autoPostX: false,
  },
] as const;

export const SCHEDULE_OPTIONS = [
  { value: "MANUAL", label: "Manual only" },
  { value: "EVERY_5_MIN", label: "Every 5 minutes" },
  { value: "EVERY_15_MIN", label: "Every 15 minutes" },
  { value: "HOURLY", label: "Every hour" },
  { value: "DAILY", label: "Daily" },
] as const;

export {
  MODEL_OPTIONS,
  CHAT_MODEL_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  CUSTOM_MODEL_VALUE,
  DEFAULT_MODEL,
  DEFAULT_IMAGE_MODEL,
  MODEL_TIER_LABELS,
  isPresetModel,
  isImageModel,
  normalizeModelId,
  isValidModelId,
  getModelLabel,
  isFreeModel,
  getImageModalities,
} from "./models";
