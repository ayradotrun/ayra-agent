"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSlashCommandCatalog,
  groupSlashCommands,
  type SlashCommandItem,
} from "@/lib/telegram/command-catalog";

type CommandGroup = ReturnType<typeof groupSlashCommands>[number];

function CommandItemsList({ items }: { items: SlashCommandItem[] }) {
  return (
    <ul className="scrollbar-hide max-h-44 space-y-2 overflow-y-auto pr-1">
      {items.map((item) => (
        <li
          key={`${item.category}-${item.command}`}
          className="rounded-lg border border-transparent px-2 py-1.5 hover:border-border/40 hover:bg-white/[0.03]"
        >
          <p className="font-mono text-[11px] font-medium text-foreground/95">{item.usage}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
            {item.description}
          </p>
          {item.aliases && item.aliases.length > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">
              alias: /{item.aliases.join(", /")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function CommandGroupCard({ group }: { group: CommandGroup }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white/[0.02] p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
        {group.label}
      </p>
      <CommandItemsList items={group.items} />
    </div>
  );
}

function CommandGroupAccordionItem({
  group,
  open,
  onToggle,
}: {
  group: CommandGroup;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
        <span className="text-xs font-semibold text-foreground/90">{group.label}</span>
        <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
          {group.items.length}
        </span>
      </button>
      {open && (
        <div className="border-t border-border/40 p-2 pt-1">
          <CommandItemsList items={group.items} />
        </div>
      )}
    </div>
  );
}

export function CommandsReferenceGrid() {
  const groups = groupSlashCommands(getSlashCommandCatalog());
  const [openId, setOpenId] = useState("");

  return (
    <>
      <div className="space-y-2.5 sm:hidden">
        {groups.map((group) => (
          <CommandGroupAccordionItem
            key={group.category}
            group={group}
            open={openId === group.category}
            onToggle={() => setOpenId(openId === group.category ? "" : group.category)}
          />
        ))}
      </div>

      <div className="hidden gap-3 sm:grid sm:grid-cols-2">
        {groups.map((group) => (
          <CommandGroupCard key={group.category} group={group} />
        ))}
      </div>
    </>
  );
}
