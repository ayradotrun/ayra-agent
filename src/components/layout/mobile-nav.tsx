"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Plus } from "lucide-react";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MOBILE_NAV_ITEMS, NEW_AGENT_HREF } from "@/components/layout/nav-config";
import { DASHBOARD_BOTTOM_OFFSET } from "@/lib/layout/site-layout";
import { useChromeHeight } from "@/hooks/use-chrome-height";

export function MobileHeader() {
  const shellRef = useRef<HTMLDivElement>(null);
  useChromeHeight(shellRef, "--dashboard-header-height", []);

  return (
    <>
      <div
        ref={shellRef}
        className="fixed inset-x-0 top-0 z-40 md:hidden"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <header className="flex h-14 items-center gap-2 border-b border-white/[0.06] bg-[hsl(220,20%,5%)]/95 px-3 backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <AyraLogo size={28} className="shrink-0 ring-1 ring-emerald-500/25" />
            <span className="truncate text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
              AYRA <span className="font-semibold text-emerald-400/90">AGENT</span>
            </span>
          </div>

          <Link
            href="/docs"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            aria-label="Documentation"
          >
            <BookOpen className="h-4 w-4" />
          </Link>

          <Link href={NEW_AGENT_HREF} className="shrink-0">
            <Button
              size="sm"
              className="h-9 min-w-[4.5rem] gap-1.5 rounded-lg bg-emerald-500/90 px-3 text-xs text-emerald-950 hover:bg-emerald-400"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Button>
          </Link>
        </header>
      </div>
      <div className="dashboard-header-spacer shrink-0 md:hidden" aria-hidden="true" />
    </>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  useChromeHeight(navRef, "--bottom-nav-height", []);

  return (
    <nav
      ref={navRef}
      aria-label="Dashboard navigation"
      className="mobile-bottom-nav md:hidden"
    >
      <div className="grid grid-cols-5 px-1 pb-1.5 pt-1.5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              pathname.startsWith(`${item.href}?`);

          const label = item.mobileLabel ?? item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1.5 text-[10px] font-medium leading-none transition-colors duration-200 sm:text-[11px]",
                active ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  active ? "scale-105 text-emerald-400" : "opacity-70"
                )}
              />
              <span className="max-w-full truncate text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** @deprecated Use DASHBOARD_BOTTOM_OFFSET from site-layout */
export const DASHBOARD_MOBILE_BOTTOM_OFFSET = DASHBOARD_BOTTOM_OFFSET;
