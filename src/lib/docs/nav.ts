import {
  BookOpen,
  Database,
  Search,
  Settings,
  MessageCircle,
  Bot,
  HelpCircle,
  Server,
  AtSign,
  Code2,
  Package,
  FileCode,
  LayoutTemplate,
  Rocket,
  Plug,
  ScrollText,
  Wrench,
  Lightbulb,
  Library,
  type LucideIcon,
} from "lucide-react";

export type DocCategory = "Start" | "Setup" | "Integrations" | "Operations" | "Resources";

export interface DocPageMeta {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Markdown file under /docs (without .md) */
  file: string;
  category: DocCategory;
}

export const DOC_PAGES: DocPageMeta[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    description: "Sign up, first agent, and what to configure first.",
    icon: BookOpen,
    file: "getting-started",
    category: "Start",
  },
  {
    slug: "private-database",
    title: "Private database",
    description: "Required BYOD Postgres for chat history and AYRA Brain.",
    icon: Database,
    file: "private-database",
    category: "Setup",
  },
  {
    slug: "jina-web-search",
    title: "Web search (Jina)",
    description: "Optional BYOK Jina API key for the web-search skill.",
    icon: Search,
    file: "jina-web-search",
    category: "Setup",
  },
  {
    slug: "settings",
    title: "Settings guide",
    description: "LLM, Telegram, X, Solana RPC, and AgentMemory.",
    icon: Settings,
    file: "settings-guide",
    category: "Setup",
  },
  {
    slug: "slash-commands",
    title: "Slash commands",
    description: "Full reference for crypto, agent, and model commands in chat and Telegram.",
    icon: Bot,
    file: "slash-commands",
    category: "Integrations",
  },
  {
    slug: "telegram",
    title: "Telegram bot",
    description: "Connect your bot, chat ID, and slash commands.",
    icon: MessageCircle,
    file: "telegram",
    category: "Integrations",
  },
  {
    slug: "x-manual-keys",
    title: "X manual API keys",
    description: "Advanced posting when OAuth is unavailable.",
    icon: AtSign,
    file: "x-manual-keys",
    category: "Integrations",
  },
  {
    slug: "agents-and-skills",
    title: "Agents & skills",
    description: "Templates, custom agents, and enabling tools.",
    icon: Bot,
    file: "agents-and-skills",
    category: "Integrations",
  },
  {
    slug: "integrations",
    title: "Integrations overview",
    description: "Telegram, X, Solana RPC, web search, and AgentMemory.",
    icon: Plug,
    file: "integrations",
    category: "Integrations",
  },
  {
    slug: "deployment",
    title: "Deployment (VPS / PM2)",
    description: "Production build, worker, Postgres, and region sync.",
    icon: Server,
    file: "deployment",
    category: "Operations",
  },
  {
    slug: "api-reference",
    title: "API reference",
    description: "REST endpoints for chat, agents, settings, and auth.",
    icon: Code2,
    file: "api-reference",
    category: "Resources",
  },
  {
    slug: "sdk",
    title: "SDK & automation",
    description: "Scripts, webhooks, and programmatic agent runs.",
    icon: Package,
    file: "sdk",
    category: "Resources",
  },
  {
    slug: "examples",
    title: "Examples",
    description: "Common workflows: research, posting, wallet watch.",
    icon: FileCode,
    file: "examples",
    category: "Resources",
  },
  {
    slug: "templates",
    title: "Agent templates",
    description: "Ayra, Aria, Marcus, Nova, and custom agents.",
    icon: LayoutTemplate,
    file: "templates",
    category: "Resources",
  },
  {
    slug: "starter-kits",
    title: "Starter kits",
    description: "Docker, VPS, and cloud quick-start bundles.",
    icon: Rocket,
    file: "starter-kits",
    category: "Resources",
  },
  {
    slug: "changelog",
    title: "Changelog",
    description: "Recent platform updates and migration notes.",
    icon: ScrollText,
    file: "changelog",
    category: "Resources",
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    description: "Build failures, worker issues, and auth problems.",
    icon: Wrench,
    file: "troubleshooting",
    category: "Resources",
  },
  {
    slug: "best-practices",
    title: "Best practices",
    description: "Security, performance, and production checklist.",
    icon: Lightbulb,
    file: "best-practices",
    category: "Resources",
  },
  {
    slug: "faq",
    title: "FAQ",
    description: "Common questions about setup, chat, and databases.",
    icon: HelpCircle,
    file: "faq",
    category: "Resources",
  },
];

export const DOC_CATEGORIES: DocCategory[] = [
  "Start",
  "Setup",
  "Integrations",
  "Operations",
  "Resources",
];

export const RESOURCES_HUB_ICON = Library;

export function getDocBySlug(slug: string): DocPageMeta | undefined {
  return DOC_PAGES.find((p) => p.slug === slug);
}

export function getDocsByCategory(category: DocCategory): DocPageMeta[] {
  return DOC_PAGES.filter((p) => p.category === category);
}
