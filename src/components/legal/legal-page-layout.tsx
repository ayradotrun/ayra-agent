import Link from "next/link";
import type { Metadata } from "next";
import { LandingHeader, LANDING_HEADER_OFFSET } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { ChevronLeft } from "lucide-react";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />

      <LandingHeader />

      <main className={`relative z-10 mx-auto max-w-3xl px-4 pb-20 sm:px-6 ${LANDING_HEADER_OFFSET}`}>
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to home
        </Link>

        <article className="glass-panel rounded-2xl p-8 sm:p-10">
          <header className="border-b border-border/40 pb-6">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
          </header>

          <div className="legal-prose mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-6 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_p_a]:text-primary [&_p_a]:underline-offset-2 [&_p_a]:hover:underline [&_ul]:mt-2 [&_ul]:space-y-1.5">
            {children}
          </div>
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}

export const legalMetadata = (title: string, description: string): Metadata => ({
  title: `${title} — AYRA Agent`,
  description,
});
