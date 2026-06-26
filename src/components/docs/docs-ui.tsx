import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Hero banner (Hypernova-style cover) ── */

interface DocsHeroProps {
  title: string;
  description: string;
  eyebrow?: string;
  coverSrc?: string;
  coverAlt?: string;
  coverWidth?: number;
  coverHeight?: number;
}

export function DocsHero({
  title,
  description,
  eyebrow,
  coverSrc,
  coverAlt,
  coverWidth = 1024,
  coverHeight = 682,
}: DocsHeroProps) {
  return (
    <>
      {eyebrow && (
        <p className="mb-3 text-base font-medium text-emerald-400">{eyebrow}</p>
      )}
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[2.75rem] lg:leading-tight">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl sm:leading-8">
        {description}
      </p>
      <div className="docs-hero-cover relative mt-8 overflow-hidden rounded-xl border border-white/[0.08] bg-[#050807]">
        {coverSrc ? (
          <Image
            src={coverSrc}
            alt={coverAlt ?? title}
            width={coverWidth}
            height={coverHeight}
            className="h-auto w-full"
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/25 via-emerald-950/50 to-[hsl(220,20%,4%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_40%_30%,rgba(52,211,153,0.4),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
            <div className="relative flex aspect-[21/9] min-h-[140px] items-center justify-center sm:min-h-[180px]">
              <span className="text-2xl font-bold tracking-tight text-white/20 sm:text-4xl">
                AYRA AGENT
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── CTA / nav cards ── */

interface DocsCardProps {
  href: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  external?: boolean;
  className?: string;
}

export function DocsCard({ href, title, description, icon: Icon, external, className }: DocsCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
          <Icon className="h-4 w-4 text-emerald-400" />
        </div>
        {external ? (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100" />
        ) : (
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        )}
      </div>
      <p className="mt-4 text-lg font-semibold text-foreground group-hover:text-emerald-300">{title}</p>
      {description && (
        <p className="mt-2 text-base leading-relaxed text-muted-foreground">{description}</p>
      )}
    </>
  );

  const cardClass = cn(
    "docs-card group flex h-full flex-col rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition-all duration-200",
    "hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] hover:shadow-[0_0_32px_-12px_rgba(52,211,153,0.2)]",
    className
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cardClass}>
        {inner}
      </a>
    );
  }

  return (
    <Link href={href} className={cardClass}>
      {inner}
    </Link>
  );
}

interface DocsCardGridProps {
  children: React.ReactNode;
  cols?: 2 | 3;
  className?: string;
}

export function DocsCardGrid({ children, cols = 3, className }: DocsCardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3 sm:gap-4",
        cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Section divider ── */

export function DocsSection({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("docs-section", className)}>
      {title && (
        <>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
          <div className="docs-divider my-6" />
        </>
      )}
      {children}
    </section>
  );
}

export function DocsCategoryLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
      {children}
    </p>
  );
}

/* ── Article page header ── */

interface DocsArticleHeaderProps {
  category: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  githubHref?: string;
}

export function DocsArticleHeader({
  category,
  title,
  description,
  githubHref,
}: DocsArticleHeaderProps) {
  return (
    <header className="docs-article-header mb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-base font-medium text-emerald-400">{category}</p>
        {githubHref && (
          <a
            href={githubHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Edit on GitHub
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground sm:text-xl sm:leading-8">
        {description}
      </p>
    </header>
  );
}

/* ── Prev / next pager ── */

interface DocsPagerProps {
  prev?: { slug: string; title: string } | null;
  next?: { slug: string; title: string } | null;
}

export function DocsPager({ prev, next }: DocsPagerProps) {
  if (!prev && !next) return null;

  return (
    <nav className="mt-12 grid gap-3 border-t border-white/[0.06] pt-8 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}`}
          className="docs-card group rounded-xl border border-white/[0.08] p-4 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]"
        >
          <span className="text-sm text-muted-foreground">Previous</span>
          <span className="mt-1 block text-base font-medium text-foreground group-hover:text-emerald-300">
            {prev.title}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="docs-card group rounded-xl border border-white/[0.08] p-4 text-right transition-all hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] sm:col-start-2"
        >
          <span className="text-sm text-muted-foreground">Next</span>
          <span className="mt-1 block text-base font-medium text-foreground group-hover:text-emerald-300">
            {next.title}
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
