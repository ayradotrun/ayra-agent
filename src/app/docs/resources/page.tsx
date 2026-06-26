import Link from "next/link";
import type { Metadata } from "next";
import { Code2, HelpCircle, Lightbulb, Wrench } from "lucide-react";
import { DocsLayout, docsMetadata } from "@/components/docs/docs-layout";
import {
  DocsHero,
  DocsCard,
  DocsCardGrid,
  DocsSection,
} from "@/components/docs/docs-ui";
import { getDocsByCategory } from "@/lib/docs/nav";

export const metadata: Metadata = docsMetadata(
  "Resources",
  "API reference, examples, templates, changelog, FAQ, and troubleshooting for AYRA Agent."
);

export default function DocsResourcesHubPage() {
  const pages = getDocsByCategory("Resources");

  return (
    <DocsLayout>
      <DocsHero
        eyebrow="Resources"
        title="Reference & troubleshooting"
        description="API notes, examples, templates, changelog, and FAQ — everything you need beyond the setup guides."
        coverSrc="/docs/resources-hero.png"
        coverAlt="AYRA Agent — reference and troubleshooting resources"
      />

      <DocsSection className="mb-10">
        <DocsCardGrid cols={3}>
          <DocsCard
            href="/docs/api-reference"
            icon={Code2}
            title="API reference"
            description="REST endpoints for chat, agents, settings, and auth"
          />
          <DocsCard
            href="/docs/faq"
            icon={HelpCircle}
            title="FAQ"
            description="Common questions about setup, chat, and databases"
          />
          <DocsCard
            href="/docs/troubleshooting"
            icon={Wrench}
            title="Troubleshooting"
            description="Build failures, worker issues, and auth problems"
          />
        </DocsCardGrid>
      </DocsSection>

      <DocsSection title="All resources">
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
      </DocsSection>

      <DocsSection className="mt-10">
        <DocsCardGrid cols={2}>
          <DocsCard
            href="/docs/best-practices"
            icon={Lightbulb}
            title="Best practices"
            description="Security, performance, and production checklist"
          />
          <DocsCard
            href="/docs"
            icon={Code2}
            title="Documentation home"
            description="Setup guides, integrations, and deployment"
          />
        </DocsCardGrid>
      </DocsSection>

      <p className="mt-10 text-base text-muted-foreground">
        Setup guides live under{" "}
        <Link href="/docs" className="text-emerald-400 underline-offset-2 hover:underline">
          Introduction
        </Link>
        .
      </p>
    </DocsLayout>
  );
}
