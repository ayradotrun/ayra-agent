"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ModelCombobox } from "@/components/settings/model-combobox";
import { normalizeModelId } from "@/lib/models";
import type { ProviderModelOption } from "@/lib/llm/provider-models";

interface FallbackModelsListProps {
  label: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  primaryModel?: string;
  catalogModels?: ProviderModelOption[];
  addLabel?: string;
  placeholder?: string;
}

export function FallbackModelsList({
  label,
  description,
  items,
  onChange,
  primaryModel,
  catalogModels = [],
  addLabel = "Add model",
  placeholder = "Search or type model ID…",
}: FallbackModelsListProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const labelFor = (id: string) => catalogModels.find((m) => m.value === id)?.label ?? id;

  function tryAdd(raw: string) {
    const model = normalizeModelId(raw);
    if (!model) {
      setError("Enter a valid model ID.");
      return false;
    }
    if (primaryModel && model === primaryModel) {
      setError("Fallback cannot match the primary model.");
      return false;
    }
    if (items.includes(model)) {
      setError("Already in the list.");
      return false;
    }
    onChange([...items, model]);
    setDraft("");
    setError("");
    return true;
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2 border-t border-border/40 pt-3">
      <div>
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {description && <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-3 py-3 text-center text-[11px] text-muted-foreground">
          No fallback models yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-2"
            >
              <span className="min-w-0 flex-1 text-xs">
                <span className="mr-1.5 text-[10px] font-medium uppercase text-muted-foreground">
                  #{index + 1}
                </span>
                <span className="font-medium text-foreground">{labelFor(item)}</span>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                  {item}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${label} ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <ModelCombobox
          className="min-w-0 flex-1"
          value={draft}
          onChange={(v) => {
            setDraft(v);
            setError("");
          }}
          models={catalogModels}
          placeholder={placeholder}
          onEnter={() => tryAdd(draft)}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-10 shrink-0 gap-1.5 text-xs sm:w-auto"
          onClick={() => tryAdd(draft)}
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
