import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { DocsLayout, docsMetadata } from "@/components/docs/docs-layout";
import { DOC_CATEGORIES, DOC_PAGES } from "@/lib/docs/nav";

export const metadata: Metadata = docsMetadata(
  "Documentation",
  "Guides for AYRA Agent — setup, private database, web search, Telegram, deployment, and troubleshooting."
);

export default function DocsHubPage() {
  return (
    <DocsLayout>
      <div className="glass-panel rounded-2xl border border-white/[0.08] p-6 sm:p-8 lg:p-10">
        <header className="border-b border-border/40 pb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Documentation</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Everything you need to run AYRA — from first sign-up to production deployment. These
            guides mirror what you configure in the dashboard and what operators set in server{" "}
            <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">.env</code>.
          </p>
        </header>

        <div className="mt-8 space-y-10">
          {DOC_CATEGORIES.map((category) => {
            const pages = DOC_PAGES.filter((p) => p.category === category);
            return (
              <section key={category}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {category}
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {pages.map((page) => (
                    <li key={page.slug}>
                      <Link
                        href={`/docs/${page.slug}`}
                        className="group flex h-full flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/[0.04]"
                      >
                        <div className="flex items-start gap-3">
                          <page.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground group-hover:text-emerald-300">
                              {page.title}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {page.description}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Source on GitHub:{" "}
          <a
            href="https://github.com/ayradotrun/ayra-agent/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            docs/
          </a>
        </p>
      </div>
    </DocsLayout>
  );
}
