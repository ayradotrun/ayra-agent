"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MOBILE_NAV_ITEMS, NEW_AGENT_HREF } from "@/components/layout/nav-config";

export function MobileHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[hsl(220,20%,5%)]/95 px-4 backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
          <Zap className="h-4 w-4 text-emerald-400" />
        </div>
        <span className="text-sm font-semibold tracking-tight">AYRA Agent</span>
      </div>
      <Link href={NEW_AGENT_HREF}>
        <Button size="sm" className="h-8 gap-1.5 rounded-lg bg-emerald-500/90 px-3 text-xs text-emerald-950 hover:bg-emerald-400">
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
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-[10px] font-medium transition-colors",
                active ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active ? "text-emerald-400" : "opacity-70")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
