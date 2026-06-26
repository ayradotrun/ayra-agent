"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
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

  return (
    <nav
      aria-label="Dashboard navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-[hsl(220,20%,5%)]/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-6 px-0.5 pb-1 pt-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              pathname.startsWith(`${item.href}?`);

          const shortLabel =
            item.href === "/dashboard"
              ? "Home"
              : item.href === "/docs"
                ? "Docs"
                : item.label.length > 7
                  ? item.label.slice(0, 6)
                  : item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-2 text-[9px] font-medium transition-colors duration-200 sm:text-[10px]",
                active ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-200",
                  active ? "scale-105 text-emerald-400" : "opacity-70"
                )}
              />
              <span className="max-w-full truncate">{shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** @deprecated Use DASHBOARD_BOTTOM_OFFSET from site-layout */
export const DASHBOARD_MOBILE_BOTTOM_OFFSET = DASHBOARD_BOTTOM_OFFSET;
