"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronLeft, LayoutDashboard } from "lucide-react";
import { DOC_CATEGORIES, DOC_PAGES } from "@/lib/docs/nav";
import { cn } from "@/lib/utils";

export function DocsSidebar() {
  const pathname = usePathname();
  const isHub = pathname === "/docs";

  return (
    <aside className="hidden w-56 shrink-0 lg:block xl:w-60">
      <div className="sticky top-[6.5rem] max-h-[calc(100vh-7rem)] overflow-y-auto pb-8">
        <Link
          href="/docs"
          className={cn(
            "mb-4 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
            isHub ? "text-emerald-400" : "text-foreground hover:text-emerald-400"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Documentation
        </Link>

        <div className="mb-4 flex flex-col gap-1 border-b border-white/[0.06] pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>

        <nav className="space-y-6">
          {DOC_CATEGORIES.map((category) => {
            const pages = DOC_PAGES.filter((p) => p.category === category);
            return (
              <div key={category}>
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
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
                          className={cn(
                            "block rounded-lg px-2 py-1.5 text-[13px] transition-colors",
                            active
                              ? "bg-white/[0.06] font-medium text-emerald-400"
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
      </div>
    </aside>
  );
}
