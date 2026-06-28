"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  filterSlashCommands,
  groupSlashCommands,
  type SlashCommandItem,
} from "@/lib/telegram/command-catalog";

interface SlashCommandMenuProps {
  input: string;
  visible: boolean;
  onSelect: (item: SlashCommandItem) => void;
  activeIndex?: number;
  className?: string;
}

export function SlashCommandMenu({
  input,
  visible,
  onSelect,
  activeIndex = 0,
  className,
}: SlashCommandMenuProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => (visible ? filterSlashCommands(input) : []),
    [input, visible]
  );
  const groups = useMemo(() => groupSlashCommands(items), [items]);
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [input]);

  useEffect(() => {
    const active = flatItems[activeIndex];
    if (!active) return;
    const el = listRef.current?.querySelector(`[data-cmd="${active.usage}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flatItems]);

  if (!visible || items.length === 0) return null;

  let runningIndex = 0;

  return (
    <div
      ref={listRef}
      className={cn(
        "scrollbar-hide max-h-64 overflow-y-auto rounded-xl border p-1.5 backdrop-blur-xl",
        "border-emerald-500/30 bg-card/60 text-card-foreground shadow-xl shadow-black/35 ring-1 ring-white/[0.08]",
        "max-md:max-h-[min(18rem,50vh)] max-md:bg-[hsl(220,18%,7%)]/60 max-md:backdrop-blur-2xl",
        className
      )}
      role="listbox"
      aria-label="Slash commands"
    >
      <p className="px-2.5 pb-1 pt-0.5 text-[10px] text-muted-foreground">
        ↑↓ navigate · Enter select · Esc close
      </p>
      {groups.map((group) => (
        <div key={group.category} className="mb-1 last:mb-0">
          <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/80">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const idx = runningIndex++;
              const active = idx === activeIndex;
              return (
                <li key={`${item.category}-${item.command}-${item.usage}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-cmd={item.usage}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      active
                        ? "bg-emerald-500/20 ring-1 ring-emerald-500/35"
                        : "hover:bg-white/[0.08] max-md:active:bg-white/[0.1]"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(item);
                    }}
                  >
                    <span className="font-mono text-[12px] font-medium text-emerald-400/95">
                      {item.usage}
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      {item.description}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
