"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  Home,
  LayoutDashboard,
  Library,
  LogIn,
  LogOut,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocsByCategory } from "@/lib/docs/nav";
import { SITE_BOTTOM_OFFSET } from "@/lib/layout/site-layout";

const RESOURCE_HREFS = new Set([
  "/docs/resources",
  ...getDocsByCategory("Resources").map((p) => `/docs/${p.slug}`),
]);

type NavIcon = React.ComponentType<{ className?: string }>;

interface BottomNavItem {
  key: string;
  label: string;
  icon: NavIcon;
  href?: string;
  exact?: boolean;
  resourceHub?: boolean;
  action?: "signout";
}

const GUEST_ITEMS: BottomNavItem[] = [
  { key: "home", href: "/", label: "Home", icon: Home, exact: true },
  { key: "docs", href: "/docs", label: "Docs", icon: BookOpen, exact: true },
  { key: "resources", href: "/docs/resources", label: "Resources", icon: Library, resourceHub: true },
  { key: "login", href: "/login", label: "Sign in", icon: LogIn, exact: true },
  { key: "register", href: "/register", label: "Sign up", icon: UserPlus, exact: true },
];

const AUTH_ITEMS: BottomNavItem[] = [
  { key: "home", href: "/", label: "Home", icon: Home, exact: true },
  { key: "docs", href: "/docs", label: "Docs", icon: BookOpen, exact: true },
  { key: "resources", href: "/docs/resources", label: "Resources", icon: Library, resourceHub: true },
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: false },
  { key: "signout", label: "Sign out", icon: LogOut, action: "signout" },
];

function isItemActive(pathname: string, item: BottomNavItem): boolean {
  if (item.action === "signout" || !item.href) return false;
  if (item.resourceHub) return RESOURCE_HREFS.has(pathname);
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Bottom navigation for public pages (landing, docs, legal) — mobile only. */
export function PublicBottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;
  const items = isAuthenticated ? AUTH_ITEMS : GUEST_ITEMS;

  return (
    <nav
      aria-label="Site navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[hsl(220,20%,5%)]/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-0.5 pb-1 pt-1">
        {items.map((item) => {
          const active = isItemActive(pathname, item);
          const className = cn(
            "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium transition-colors duration-200",
            active ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
          );
          const iconClass = cn(
            "h-5 w-5 shrink-0 transition-transform duration-200",
            active ? "scale-105 text-emerald-400" : "opacity-75"
          );

          if (item.action === "signout") {
            return (
              <button
                key={item.key}
                type="button"
                className={className}
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <item.icon className={iconClass} />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.key} href={item.href!} className={className}>
              <item.icon className={iconClass} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** @deprecated Use SITE_BOTTOM_OFFSET from site-layout */
export const PUBLIC_BOTTOM_NAV_OFFSET = SITE_BOTTOM_OFFSET;

/** Dashboard shortcut on docs (desktop header area). */
export function DocsDashboardLink({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <LayoutDashboard className="h-3.5 w-3.5" />
      Dashboard
    </Link>
  );
}
