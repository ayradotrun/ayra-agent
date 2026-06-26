"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { getDocsBreadcrumb } from "@/lib/docs/headings";
import { DocsSidebarNav } from "@/components/docs/docs-sidebar-nav";
import { cn } from "@/lib/utils";

export function DocsMobileChrome() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const crumbs = getDocsBreadcrumb(pathname);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      <div
        className="fixed inset-x-0 top-0 z-50 flex h-12 items-center justify-between border-b border-white/[0.06] bg-background px-4 lg:hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <Link href="/docs" className="text-base font-bold tracking-tight">
          AYRA <span className="text-emerald-400">AGENT</span>
        </Link>
        <button
          type="button"
          aria-label="Search documentation"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
          onClick={() => setDrawerOpen(true)}
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      <div className="fixed inset-x-0 top-12 z-50 flex h-10 items-center gap-2 border-b border-white/[0.06] bg-background px-3 lg:hidden">
        <button
          type="button"
          aria-label="Open docs menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </button>
        <nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          {crumbs.map((crumb, i) => (
            <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className="text-muted-foreground/40">›</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="truncate hover:text-foreground">
                  {crumb.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(300px,88vw)] flex-col border-r border-white/[0.08] bg-background shadow-2xl">
            <div className="flex h-12 shrink-0 items-center justify-end border-b border-white/[0.06] px-3">
              <button
                type="button"
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <DocsSidebarNav onNavigate={() => setDrawerOpen(false)} className="min-h-0 flex-1" />
          </aside>
        </div>
      )}

      <div className="docs-mobile-chrome-spacer lg:hidden" aria-hidden />
    </>
  );
}

export function DocsBreadcrumb({ className }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = getDocsBreadcrumb(pathname);

  return (
    <nav className={cn("mb-6 hidden items-center gap-1.5 text-base text-muted-foreground lg:flex", className)}>
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground/40">›</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-foreground">
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
