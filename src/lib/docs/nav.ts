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
  type LucideIcon,
} from "lucide-react";

export interface DocPageMeta {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Markdown file under /docs (without .md) */
  file: string;
  category: "Start" | "Setup" | "Integrations" | "Operations";
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
    slug: "deployment",
    title: "Deployment (VPS / PM2)",
    description: "Production build, worker, Postgres, and region sync.",
    icon: Server,
    file: "deployment",
    category: "Operations",
  },
  {
    slug: "faq",
    title: "FAQ & troubleshooting",
    description: "Common errors, slow chat, and database issues.",
    icon: HelpCircle,
    file: "faq",
    category: "Operations",
  },
];

export const DOC_CATEGORIES = ["Start", "Setup", "Integrations", "Operations"] as const;

export function getDocBySlug(slug: string): DocPageMeta | undefined {
  return DOC_PAGES.find((p) => p.slug === slug);
}
