import type { Metadata } from "next";
import {
  Bot,
  Code2,
  Database,
  Lock,
  MessageCircle,
  Rocket,
  Shield,
  Zap,
} from "lucide-react";
import { DocsLayout, docsMetadata } from "@/components/docs/docs-layout";
import {
  DocsHero,
  DocsCard,
  DocsCardGrid,
  DocsSection,
  DocsCategoryLabel,
} from "@/components/docs/docs-ui";
import { DOC_CATEGORIES, DOC_PAGES } from "@/lib/docs/nav";
import { GITHUB_DOCS_TREE_URL, GITHUB_REPO_URL } from "@/lib/docs/github";

export const metadata: Metadata = docsMetadata(
  "Documentation",
  "Guides for AYRA Agent — setup, private database, web search, Telegram, deployment, and troubleshooting."
);

const HIGHLIGHTS = [
  {
    icon: Bot,
    title: "Autonomous agents",
    description: "Personas, skills, schedules, and chat — built for Solana dev workflows.",
    href: "/docs/agents-and-skills",
  },
  {
    icon: Database,
    title: "Your private database",
    description: "BYOD Postgres for chat history and brain tasks — nothing shared on our DB.",
    href: "/docs/private-database",
  },
  {
    icon: Lock,
    title: "Encrypted secrets",
    description: "API keys, bot tokens, and DB URLs encrypted at rest with AES-256-GCM.",
    href: "/docs/settings",
  },
  {
    icon: MessageCircle,
    title: "Telegram + web chat",
    description: "Dashboard sessions, slash commands, and a bot for your default agent.",
    href: "/docs/telegram",
  },
  {
    icon: Shield,
    title: "Open source",
    description: "MIT-licensed — audit, self-host, and extend the platform yourself.",
    href: GITHUB_REPO_URL,
    external: true,
  },
  {
    icon: Zap,
    title: "Production ready",
    description: "VPS deploy with PM2, worker process, and region-aware cron blueprints.",
    href: "/docs/deployment",
  },
];

export default function DocsHubPage() {
  return (
    <DocsLayout>
      <DocsHero
        eyebrow="Getting Started"
        title="Build trusted AI agents for Solana"
        description="Privacy-first autonomous agents — wallet tracking, token research, X drafts, Telegram alerts, and scheduled brain tasks. Self-hostable and open source."
        coverSrc="/docs/introduction-hero.png"
        coverAlt="AYRA Agent — build trusted AI agents for Solana"
      />

      <DocsSection className="mb-12">
        <DocsCardGrid cols={3}>
          <DocsCard
            href="/docs/getting-started"
            icon={Rocket}
            title="Getting started"
            description="Sign up, connect your database, and launch your first agent"
          />
          <DocsCard
            href="/docs/resources"
            icon={Code2}
            title="Resources"
            description="API reference, examples, FAQ, and troubleshooting"
          />
          <DocsCard
            href={GITHUB_REPO_URL}
            icon={Bot}
            title="GitHub"
            description="Source code, issues, and contributions"
            external
          />
        </DocsCardGrid>
      </DocsSection>

      <DocsSection title="Key highlights" className="mb-12">
        <DocsCardGrid cols={3}>
          {HIGHLIGHTS.map((item) => (
            <DocsCard
              key={item.title}
              href={item.href}
              icon={item.icon}
              title={item.title}
              description={item.description}
              external={"external" in item && item.external}
            />
          ))}
        </DocsCardGrid>
      </DocsSection>

      <DocsSection title="Browse by topic" className="mb-8">
        <div className="space-y-10">
          {DOC_CATEGORIES.map((category) => {
            const pages = DOC_PAGES.filter((p) => p.category === category);
            return (
              <div key={category}>
                <DocsCategoryLabel>{category}</DocsCategoryLabel>
                <DocsCardGrid cols={2}>
                  {pages.map((page) => (
                    <DocsCard
                      key={page.slug}
                      href={`/docs/${page.slug}`}
                      icon={page.icon}
                      title={page.title}
                      description={page.description}
                    />
                  ))}
                </DocsCardGrid>
              </div>
            );
          })}
        </div>
      </DocsSection>

      <DocsSection className="mt-12">
        <DocsCardGrid cols={2}>
          <DocsCard
            href="/docs/getting-started"
            icon={Rocket}
            title="How it works"
            description="From sign-up to your first agent in four steps"
          />
          <DocsCard
            href="/docs/private-database"
            icon={Database}
            title="Private database setup"
            description="Connect BYOD Postgres — required for chat and brain tasks"
          />
        </DocsCardGrid>
      </DocsSection>

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Source markdown on{" "}
        <a
          href={GITHUB_DOCS_TREE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 underline-offset-2 hover:underline"
        >
          GitHub
        </a>
      </p>
    </DocsLayout>
  );
}
