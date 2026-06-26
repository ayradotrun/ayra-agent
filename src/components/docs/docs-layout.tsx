import type { Metadata } from "next";
import {
  LandingHeader,
  LANDING_CONTAINER_CLASS,
  LANDING_HEADER_OFFSET,
} from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { DocsSidebar } from "@/components/docs/docs-sidebar";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
      <div className="pointer-events-none absolute left-1/2 top-[5rem] h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl sm:top-[5.5rem]" />

      <LandingHeader />

      <main className={`relative z-0 pb-20 ${LANDING_HEADER_OFFSET}`}>
        <div className={`${LANDING_CONTAINER_CLASS} max-w-6xl`}>
          <div className="flex gap-8 lg:gap-10">
            <DocsSidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export const docsMetadata = (title: string, description: string): Metadata => ({
  title: `${title} — AYRA Docs`,
  description,
});
