"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus } from "lucide-react";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MOBILE_NAV_ITEMS, NEW_AGENT_HREF } from "@/components/layout/nav-config";
import { useMobileWorkspace } from "@/components/layout/mobile-workspace-context";

export function MobileHeader() {
  const { toggleWorkspace } = useMobileWorkspace();

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-white/[0.06] bg-[hsl(220,20%,5%)]/95 px-3 backdrop-blur-xl md:hidden">
      <button
        type="button"
        aria-label="Open workspace menu"
        onClick={toggleWorkspace}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground transition-colors hover:bg-white/[0.08]"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <AyraLogo size={28} className="shrink-0 ring-1 ring-emerald-500/25" />
        <span className="truncate text-sm font-semibold tracking-tight">AYRA Agent</span>
      </div>

      <Link href={NEW_AGENT_HREF} className="shrink-0">
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-lg bg-emerald-500/90 px-3 text-xs text-emerald-950 hover:bg-emerald-400"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Button>
      </Link>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-[hsl(220,20%,5%)]/95 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-0.5 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-0.5">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              pathname.startsWith(`${item.href}?`);

          const shortLabel =
            item.href === "/dashboard"
              ? "Home"
              : item.label.length > 7
                ? item.label.slice(0, 6)
                : item.label;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-emerald-400" : "opacity-70")} />
              <span className="max-w-full truncate">{shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
