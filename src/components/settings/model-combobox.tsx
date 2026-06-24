"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderModelOption } from "@/lib/llm/provider-models";

interface ModelComboboxProps {
  value: string;
  onChange: (value: string) => void;
  models?: ProviderModelOption[];
  placeholder?: string;
  id?: string;
  className?: string;
  /** Called when Enter is pressed (e.g. add fallback row) */
  onEnter?: () => void;
}

export function ModelCombobox({
  value,
  onChange,
  models = [],
  placeholder = "Search or type model ID…",
  id,
  className,
  onEnter,
}: ModelComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const trimmedQuery = query.trim();
  const hasCatalog = models.length > 0;

  const filtered = useMemo(() => {
    if (!hasCatalog) return [];
    const q = trimmedQuery.toLowerCase();
    if (!q) return models.slice(0, 80);
    return models
      .filter((m) => m.label.toLowerCase().includes(q) || m.value.toLowerCase().includes(q))
      .slice(0, 80);
  }, [hasCatalog, models, trimmedQuery]);

  const exactCatalogMatch = hasCatalog && models.some((m) => m.value === trimmedQuery);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function selectModel(id: string) {
    setQuery(id);
    onChange(id);
    setOpen(false);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    onChange(next);
    if (hasCatalog) setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onChange(trimmedQuery);
      setOpen(false);
      onEnter?.();
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" && hasCatalog) {
      e.preventDefault();
      setOpen(true);
    }
  }

  const showList = open && hasCatalog;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => hasCatalog && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-secondary/50 px-3 py-2 pr-9 text-sm ring-offset-background",
            "font-mono text-xs placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        />
        {hasCatalog && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Show models"
            className="absolute right-2 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen((v) => !v);
              inputRef.current?.focus();
            }}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>

      {showList && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border/80 bg-[hsl(220,20%,7%)] py-1 shadow-lg"
        >
          {trimmedQuery && !exactCatalogMatch && (
            <li>
              <button
                type="button"
                role="option"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs hover:bg-muted/30"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectModel(trimmedQuery)}
              >
                <span className="font-medium text-foreground">Use custom ID</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">{trimmedQuery}</span>
              </button>
            </li>
          )}

          {filtered.length === 0 && !trimmedQuery && (
            <li className="px-3 py-2 text-xs text-muted-foreground">Type to search or enter a model ID</li>
          )}

          {filtered.length === 0 && trimmedQuery && exactCatalogMatch === false && (
            <li className="px-3 py-2 text-xs text-muted-foreground">No catalog match — use custom ID above</li>
          )}

          {filtered.map((m) => {
            const active = m.value === trimmedQuery;
            return (
              <li key={m.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-muted/30",
                    active && "bg-primary/10"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectModel(m.value)}
                >
                  <span className="mt-0.5 shrink-0">
                    {active ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <span className="inline-block h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">{m.label}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{m.value}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
