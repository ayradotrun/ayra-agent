"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, NEW_AGENT_HREF } from "@/components/layout/nav-config";

interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "A";
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-white/[0.06] bg-[hsl(220,20%,5%)]/95 backdrop-blur-2xl">
      <div className="flex h-[60px] items-center gap-3 px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-emerald-500/20 bg-emerald-500/10">
          <Zap className="h-4 w-4 text-emerald-400" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[hsl(220,20%,5%)]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-foreground">
            AYRA Agent
          </p>
          <p className="truncate text-[11px] text-muted-foreground">Command center</p>
        </div>
      </div>

      <div className="px-3 pt-2">
        <Link href={NEW_AGENT_HREF}>
          <Button className="h-9 w-full justify-start gap-2 rounded-lg bg-emerald-500/90 text-[13px] font-medium text-emerald-950 shadow-none hover:bg-emerald-400">
            <Plus className="h-3.5 w-3.5" />
            New agent
          </Button>
        </Link>
      </div>

      <div className="px-5 pt-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          Workspace
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-150",
                active
                  ? "bg-white/[0.06] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-emerald-400" />
              )}
              <item.icon className={cn("h-4 w-4", active ? "text-emerald-400" : "opacity-70")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[11px] font-medium text-emerald-300">
            {getInitials(user?.name, user?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium">{user?.name || "Developer"}</p>
            <p className="truncate text-[10px] text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start rounded-lg px-2 text-[12px] text-muted-foreground hover:text-foreground"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
