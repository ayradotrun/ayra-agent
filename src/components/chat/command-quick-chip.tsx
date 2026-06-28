"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlashCommandItem } from "@/lib/telegram/command-catalog";

interface CommandQuickChipProps {
  item: SlashCommandItem;
  onPick: (item: SlashCommandItem) => void;
  className?: string;
}

export function CommandQuickChip({ item, onPick, className }: CommandQuickChipProps) {
  return (
    <button
      type="button"
      title={item.description}
      className={cn(
        "group flex max-w-[140px] flex-col items-start rounded-xl border border-border/50 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/[0.06]",
        className
      )}
      onClick={() => onPick(item)}
    >
      <span className="font-mono text-[11px] font-medium text-emerald-400/90">
        {item.usage.split(" [")[0]}
      </span>
      <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground group-hover:text-foreground/80">
        {item.description}
      </span>
    </button>
  );
}

interface CommandListPanelProps {
  title: string;
  items: Array<{ cmd: string; desc: string }>;
  open: boolean;
  onToggle: () => void;
  onPick: (cmd: string) => void;
}

function CommandListPanel({ title, items, open, onToggle, onPick }: CommandListPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-foreground/90 transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
        {title}
      </button>
      {open && (
        <ul className="scrollbar-hide max-h-52 space-y-0.5 overflow-y-auto border-t border-border/40 p-2">
          {items.map((c) => (
            <li key={c.cmd}>
              <button
                type="button"
                className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left hover:bg-white/[0.04]"
                onClick={() => onPick(c.cmd.includes("[") ? `${c.cmd.split(" [")[0]} ` : c.cmd)}
              >
                <span className="font-mono text-[11px] font-medium text-emerald-400/90">{c.cmd}</span>
                <span className="text-[11px] text-muted-foreground">{c.desc}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface CommandReferenceSection {
  id: string;
  title: string;
  items: Array<{ cmd: string; desc: string }>;
}

interface CommandReferenceAccordionProps {
  sections: CommandReferenceSection[];
  onPick: (cmd: string) => void;
  defaultOpenId?: string;
  className?: string;
}

export function CommandReferenceAccordion({
  sections,
  onPick,
  defaultOpenId,
  className,
}: CommandReferenceAccordionProps) {
  const [openId, setOpenId] = useState(defaultOpenId ?? "");

  return (
    <div className={cn("grid gap-2.5", className)}>
      {sections.map((section) => (
        <CommandListPanel
          key={section.id}
          title={section.title}
          items={section.items}
          open={openId === section.id}
          onToggle={() => setOpenId(openId === section.id ? "" : section.id)}
          onPick={onPick}
        />
      ))}
    </div>
  );
}
