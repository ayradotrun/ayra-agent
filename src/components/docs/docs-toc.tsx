"use client";

import { useEffect, useState } from "react";
import { List } from "lucide-react";
import type { DocHeading } from "@/lib/docs/headings";
import { cn } from "@/lib/utils";

interface DocsTocProps {
  headings: DocHeading[];
  className?: string;
}

export function DocsToc({ headings, className }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className={cn("docs-toc", className)} aria-label="On this page">
      <div className="mb-4 flex items-center gap-2 text-base font-medium text-foreground">
        <List className="h-4 w-4 text-muted-foreground" />
        On this page
      </div>
      <ul className="space-y-2.5 border-l border-white/[0.06]">
        {headings.map((h) => (
          <li key={h.id} className={cn(h.level === 3 && "ml-3")}>
            <a
              href={`#${h.id}`}
              className={cn(
                "block border-l-2 py-0.5 pl-3 text-[15px] leading-snug transition-colors",
                activeId === h.id
                  ? "border-emerald-400 font-medium text-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function DocsTocMobile({ headings }: { headings: DocHeading[] }) {
  if (headings.length === 0) return null;

  return (
    <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] xl:hidden [&::-webkit-scrollbar]:hidden">
      {headings
        .filter((h) => h.level === 2)
        .slice(0, 6)
        .map((h) => (
          <a
            key={h.id}
            href={`#${h.id}`}
            className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {h.text}
          </a>
        ))}
    </div>
  );
}
