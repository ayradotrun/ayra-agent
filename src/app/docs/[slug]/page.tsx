import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DocsLayout, docsMetadata } from "@/components/docs/docs-layout";
import { MarkdownBody } from "@/components/docs/markdown-body";
import { loadDocMarkdown } from "@/lib/docs/load-doc";
import { DOC_PAGES, getDocBySlug } from "@/lib/docs/nav";

interface DocPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return DOC_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return {};
  return docsMetadata(doc.title, doc.description);
}

export default async function DocArticlePage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const markdown = loadDocMarkdown(doc.file);
  if (!markdown) notFound();

  const index = DOC_PAGES.findIndex((p) => p.slug === slug);
  const prev = index > 0 ? DOC_PAGES[index - 1] : null;
  const next = index < DOC_PAGES.length - 1 ? DOC_PAGES[index + 1] : null;

  return (
    <DocsLayout>
      <article className="glass-panel rounded-2xl border border-white/[0.08] p-6 sm:p-8 lg:p-10">
        <Link
          href="/docs"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          All docs
        </Link>

        <header className="border-b border-border/40 pb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <doc.icon className="h-4 w-4 text-emerald-400" />
            <span>{doc.category}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{doc.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{doc.description}</p>
        </header>

        <div className="mt-8">
          <MarkdownBody content={markdown} />
        </div>

        {(prev || next) && (
          <nav className="mt-10 flex flex-col gap-3 border-t border-border/40 pt-6 sm:flex-row sm:justify-between">
            {prev ? (
              <Link
                href={`/docs/${prev.slug}`}
                className="group flex flex-col rounded-lg border border-white/[0.06] px-4 py-3 transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/[0.04]"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </span>
                <span className="mt-1 text-sm font-medium text-foreground group-hover:text-emerald-300">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/docs/${next.slug}`}
                className="group flex flex-col rounded-lg border border-white/[0.06] px-4 py-3 text-right transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] sm:ml-auto"
              >
                <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 text-sm font-medium text-foreground group-hover:text-emerald-300">
                  {next.title}
                </span>
              </Link>
            ) : null}
          </nav>
        )}
      </article>
    </DocsLayout>
  );
}
