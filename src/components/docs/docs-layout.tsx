import type { Metadata } from "next";
import { PublicBottomNav } from "@/components/layout/public-bottom-nav";
import { DocsSidebarNav } from "@/components/docs/docs-sidebar-nav";
import { DocsMobileChrome, DocsBreadcrumb } from "@/components/docs/docs-mobile-chrome";
import { DocsToc } from "@/components/docs/docs-toc";
import type { DocHeading } from "@/lib/docs/headings";
import { MobileBottomSpacer } from "@/components/layout/mobile-bottom-spacer";

interface DocsLayoutProps {
  children: React.ReactNode;
  tocHeadings?: DocHeading[];
}

export function DocsLayout({ children, tocHeadings = [] }: DocsLayoutProps) {
  const hasToc = tocHeadings.length > 0;

  return (
    <div className="docs-shell min-h-screen bg-background">
      {/* Desktop left sidebar — full height, Hypernova-style */}
      <aside className="docs-left-sidebar fixed inset-y-0 left-0 z-40 hidden w-[288px] border-r border-white/[0.06] bg-background lg:flex lg:flex-col">
        <DocsSidebarNav className="h-full" />
      </aside>

      <DocsMobileChrome />

      {/* Desktop right TOC */}
      {hasToc && (
        <aside className="docs-right-toc fixed inset-y-0 right-0 z-30 hidden w-[220px] border-l border-white/[0.06] bg-background xl:block">
          <div className="sticky top-0 max-h-screen overflow-y-auto px-6 py-10">
            <DocsToc headings={tocHeadings} />
          </div>
        </aside>
      )}

      <main
        className={`docs-main relative min-h-screen lg:pl-[288px] ${hasToc ? "xl:pr-[220px]" : ""} lg:pb-10`}
      >
        <div className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
          <DocsBreadcrumb />
          {children}
          <MobileBottomSpacer />
        </div>
      </main>

      <PublicBottomNav />
    </div>
  );
}

export const docsMetadata = (title: string, description: string): Metadata => ({
  title: `${title} — AYRA Docs`,
  description,
});
