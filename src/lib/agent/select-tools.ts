/** Pick a small relevant tool set so free models can reliably call functions */

const TELEGRAM_ALWAYS = [
  "sol-price-checker",
  "token-quick-lookup",
  "jupiter-price",
  "token-finder",
  "rugcheck",
  "token-price-tracker",
  "trending-tokens",
  "meme-coin-scanner",
  "token-quality-report",
  "image-generator",
  "web-search",
  "memory-search",
  "brain-task-schedule",
  "brain-task-list",
  "brain-calendar-plan",
  "task-planner",
  "goal-tracker",
] as const;

const KEYWORD_TOOLS: Array<{ pattern: RegExp; slugs: string[] }> = [
  {
    pattern: /\b(sol|solana|harga|price|cek|token|mint|crypto|dex|coin|pump|meme|rug|aman|safe|scam)\b/i,
    slugs: [
      "sol-price-checker",
      "jupiter-price",
      "token-price-tracker",
      "token-finder",
      "rugcheck",
      "dex-monitor",
      "token-tracker",
      "wallet-tracker",
      "wallet-networth",
      "token-recommendation",
      "whale-tracker",
      "new-token-monitor",
      "meme-coin-scanner",
      "token-quality-report",
      "portfolio-tracker",
      "network-stats",
      "sns-resolver",
    ],
  },
  {
    pattern: /\b(gambar|image|generate|draw|logo|banner|poster)\b/i,
    slugs: ["image-generator"],
  },
  {
    pattern: /\b(tweet|thread|twitter|\bx\b|posting|calendar|schedule|content plan)\b/i,
    slugs: [
      "x-draft-generator",
      "x-thread-drafter",
      "viral-topic-finder",
      "x-post",
      "brain-calendar-plan",
      "brain-task-schedule",
      "content-calendar",
    ],
  },
  {
    pattern: /\b(task|reminder|todo|goals?|plan my|schedule)\b/i,
    slugs: [
      "brain-task-schedule",
      "brain-task-list",
      "brain-task-cancel",
      "task-planner",
      "goal-tracker",
      "scheduled-tasks",
    ],
  },
  {
    pattern: /\b(github|repo|pull request|issue|code review)\b/i,
    slugs: ["github-repo-analyzer", "github-reader", "issue-assistant", "code-review-assistant"],
  },
  {
    pattern: /\b(website|uptime|ssl|domain|seo|scrape|url|http)\b/i,
    slugs: ["website-health", "website-scraper", "ssl-monitor", "seo-audit"],
  },
  {
    pattern: /\b(search|cari|news|rss|research|docs)\b/i,
    slugs: ["web-search", "news-monitor", "rss-reader", "documentation-reader"],
  },
  {
    pattern: /\b(wallet|address|balance|dompet)\b/i,
    slugs: ["wallet-tracker", "portfolio-tracker", "whale-tracker"],
  },
];

const MAX_TELEGRAM_TOOLS = 18;

export function selectSkillSlugsForRun(
  enabledSlugs: string[],
  trigger: "manual" | "scheduled" | "telegram" | "chat",
  userMessage?: string
): string[] {
  if (trigger !== "telegram" && trigger !== "chat") return enabledSlugs;

  // Focused custom agents — use exactly the skills the user selected
  if (enabledSlugs.length <= MAX_TELEGRAM_TOOLS) {
    return enabledSlugs;
  }

  const enabled = new Set(enabledSlugs);
  const picked = new Set<string>();

  for (const slug of TELEGRAM_ALWAYS) {
    if (enabled.has(slug)) picked.add(slug);
  }

  const msg = userMessage || "";
  for (const { pattern, slugs } of KEYWORD_TOOLS) {
    if (pattern.test(msg)) {
      for (const slug of slugs) {
        if (enabled.has(slug)) picked.add(slug);
      }
    }
  }

  if (picked.size < 3) {
    for (const slug of enabledSlugs) {
      picked.add(slug);
      if (picked.size >= MAX_TELEGRAM_TOOLS) break;
    }
  }

  return Array.from(picked).slice(0, MAX_TELEGRAM_TOOLS);
}
