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
  "x-post",
  "x-draft-generator",
  "x-profile-lookup",
  "x-timeline-reader",
] as const;

const KEYWORD_TOOLS: Array<{ pattern: RegExp; slugs: string[] }> = [
  {
    pattern: /\b(sol|solana|price|token|mint|crypto|dex|coin|pump|meme|rug|safe|scam)\b/i,
    slugs: [
      "sol-price-checker",
      "jupiter-price",
      "token-price-tracker",
      "token-finder",
      "rugcheck",
      "dex-monitor",
      "token-tracker",
      "wallet-tracker",
      "token-recommendation",
      "new-token-monitor",
      "meme-coin-scanner",
      "token-quality-report",
      "portfolio-tracker",
      "network-stats",
      "sns-resolver",
    ],
  },
  {
    pattern: /\b(image|generate|draw|logo|banner|poster)\b/i,
    slugs: ["image-generator"],
  },
  {
    pattern: /\b(tweet|thread|twitter|post|posting|publish|tes post|coba post|content plan|calendar|schedule)\b/i,
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
    pattern:
      /\b(akun\s+x|x\s+account|twitter\s+profile|profile\s+x|search\s+akun|cari\s+akun|lookup\s+@|x\.com\/|twitter\.com\/)\b|@[a-z0-9_]{1,15}\b/i,
    slugs: ["x-profile-lookup", "x-timeline-reader"],
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
    pattern: /\b(explain|help|why|how|what is|compare|analyze|summary|summarize|teach|learn)\b/i,
    slugs: [
      "web-search",
      "memory-search",
      "documentation-reader",
      "news-monitor",
      "task-planner",
      "goal-tracker",
    ],
  },
  {
    pattern: /\b(code|debug|review|refactor|api|deploy|docker|kubernetes|ci|cd)\b/i,
    slugs: [
      "github-repo-analyzer",
      "github-reader",
      "code-review-assistant",
      "issue-assistant",
      "documentation-reader",
      "web-search",
    ],
  },
  {
    pattern: /\b(wallet|address|balance)\b/i,
    slugs: ["wallet-tracker", "portfolio-tracker"],
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
