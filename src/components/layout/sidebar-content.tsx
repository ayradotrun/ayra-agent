"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BookOpen, LogOut, Plus } from "lucide-react";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { AyraSocialLinks } from "@/components/brand/ayra-social-links";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChatRecentsList } from "@/components/chat/chat-recents-list";
import { NAV_ITEMS, NEW_AGENT_HREF, ADMIN_NAV_ITEM } from "@/components/layout/nav-config";

interface SidebarContentProps {
  user?: {
    name?: string | null;
    email?: string | null;
    isAdmin?: boolean;
  };
  onNavigate?: () => void;
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

export function SidebarContent({ user, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const workspaceItems = NAV_ITEMS.filter((item) => item.href !== "/dashboard/settings");
  const settingsItem = NAV_ITEMS.find((item) => item.href === "/dashboard/settings");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[60px] shrink-0 items-center gap-3 px-5">
        <AyraLogo size={36} className="ring-1 ring-emerald-500/25" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-foreground">
            AYRA Agent
          </p>
          <p className="truncate text-[11px] text-muted-foreground">Command center</p>
        </div>
      </div>

      <div className="shrink-0 px-3 pt-2">
        <Link href={NEW_AGENT_HREF} onClick={onNavigate}>
          <Button className="h-9 w-full justify-start gap-2 rounded-lg bg-emerald-500/90 text-[13px] font-medium text-emerald-950 shadow-none hover:bg-emerald-400">
            <Plus className="h-3.5 w-3.5" />
            New agent
          </Button>
        </Link>
      </div>

      <div className="shrink-0 px-5 pt-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          Workspace
        </p>
      </div>

      <nav className="shrink-0 space-y-0.5 px-3 pt-2">
        {workspaceItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              pathname.startsWith(`${item.href}?`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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

        {settingsItem && (
          <>
            <div className="pt-2" />
            {(() => {
              const item = settingsItem;
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  href={item.href}
                  onClick={onNavigate}
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
                  <item.icon
                    className={cn("h-4 w-4", active ? "text-emerald-400" : "opacity-70")}
                  />
                  {item.label}
                </Link>
              );
            })()}
          </>
        )}

        {user?.isAdmin && (
          <>
            <div className="pt-2" />
            {(() => {
              const item = ADMIN_NAV_ITEM;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  href={item.href}
                  onClick={onNavigate}
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
                  <item.icon
                    className={cn("h-4 w-4", active ? "text-emerald-400" : "opacity-70")}
                  />
                  {item.label}
                </Link>
              );
            })()}
          </>
        )}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col px-3 pt-4 pb-2">
        <Suspense
          fallback={
            <p className="px-2 py-2 text-[11px] text-muted-foreground">Loading recents…</p>
          }
        >
          <ChatRecentsList className="min-h-0 flex-1" />
        </Suspense>
      </div>

      <div className="shrink-0 border-t border-white/[0.06] p-3">
        <Link
          href="/docs"
          onClick={onNavigate}
          className="mb-3 flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground"
        >
          <BookOpen className="h-3.5 w-3.5 text-emerald-400/80" />
          Documentation
        </Link>
        <AyraSocialLinks
          className="mb-3 justify-center gap-4 px-1 sm:justify-start"
          showLabels
          iconClassName="h-3.5 w-3.5"
        />
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
    </div>
  );
}
