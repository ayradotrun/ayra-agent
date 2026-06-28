import { ALL_SKILL_DEFINITIONS, SKILL_CATEGORIES } from "@/lib/skills/catalog";

const FEATURED_SLUGS = [
  "wallet-tracker",
  "token-quick-lookup",
  "trending-tokens",
  "meme-coin-scanner",
  "token-quality-report",
  "security-audit",
  "x-thread-drafter",
  "web-search",
  "yield-optimizer",
  "brain-task-schedule",
] as const;

export function getLandingSkillCatalog() {
  const enabled = ALL_SKILL_DEFINITIONS.filter((skill) => skill.isEnabled);

  const categories = SKILL_CATEGORIES.map((category) => ({
    category,
    skills: enabled.filter((skill) => skill.category === category),
  })).filter((group) => group.skills.length > 0);

  const featured = FEATURED_SLUGS.map((slug) => enabled.find((skill) => skill.slug === slug)).filter(
    (skill): skill is (typeof enabled)[number] => !!skill
  );

  return {
    total: enabled.length,
    categories,
    featured,
  };
}
