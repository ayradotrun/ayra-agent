"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { AyraLogo } from "@/components/brand/ayra-logo";
import { AYRA_GITHUB_URL, AYRA_X_URL } from "@/components/brand/ayra-social-links";
import { DOC_CATEGORIES, DOC_PAGES } from "@/lib/docs/nav";
import { cn } from "@/lib/utils";

interface DocsSidebarNavProps {
  onNavigate?: () => void;
  className?: string;
}

export function DocsSidebarNav({ onNavigate, className }: DocsSidebarNavProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return DOC_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [query]);

  const isHub = pathname === "/docs";
  const isResourcesHub = pathname === "/docs/resources";

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="shrink-0 border-b border-white/[0.06] px-4 py-4">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5">
          <AyraLogo size={28} className="ring-1 ring-emerald-500/25" />
          <span className="text-base font-bold tracking-tight text-foreground">
            AYRA <span className="font-semibold text-emerald-400">AGENT</span>
          </span>
        </Link>
      </div>

      <div className="shrink-0 px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-9 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:border-emerald-500/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
          <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Ctrl K
          </kbd>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {filtered ? (
          <ul className="space-y-0.5">
            {filtered.length === 0 ? (
              <li className="px-2 py-4 text-base text-muted-foreground">No results</li>
            ) : (
              filtered.map((page) => {
                const href = `/docs/${page.slug}`;
                const active = pathname === href;
                return (
                  <li key={page.slug}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      className={cn(
                        "block rounded-md px-2 py-2 text-[15px] transition-colors",
                        active ? "bg-emerald-500/10 text-emerald-400" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {page.title}
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        ) : (
          <>
            <div className="mb-4 space-y-0.5 px-1">
              <Link
                href="/docs"
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-2 py-2 text-[15px] font-medium transition-colors",
                  isHub ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Introduction
              </Link>
              <Link
                href="/docs/resources"
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-2 py-2 text-[15px] font-medium transition-colors",
                  isResourcesHub ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Resources
              </Link>
            </div>

            <nav className="space-y-6">
              {DOC_CATEGORIES.map((category) => {
                const pages = DOC_PAGES.filter((p) => p.category === category);
                return (
                  <div key={category}>
                    <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground/55">
                      {category}
                    </p>
                    <ul className="space-y-0.5">
                      {pages.map((page) => {
                        const href = `/docs/${page.slug}`;
                        const active = pathname === href;
                        return (
                          <li key={page.slug}>
                            <Link
                              href={href}
                              onClick={onNavigate}
                              className={cn(
                                "block rounded-md px-2 py-2 text-[15px] leading-snug transition-colors",
                                active
                                  ? "bg-emerald-500/10 font-medium text-emerald-400"
                                  : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                              )}
                            >
                              {page.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </>
        )}
      </div>

      <div className="shrink-0 space-y-0.5 border-t border-white/[0.06] px-4 py-4">
        <a
          href={AYRA_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-md px-2 py-2 text-[15px] text-muted-foreground hover:text-foreground"
        >
          GitHub
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <a
          href={AYRA_X_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-md px-2 py-2 text-[15px] text-muted-foreground hover:text-foreground"
        >
          Follow on X
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
        <Link
          href="/register"
          onClick={onNavigate}
          className="flex items-center justify-between rounded-md px-2 py-2 text-[15px] text-muted-foreground hover:text-foreground"
        >
          Sign up
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
