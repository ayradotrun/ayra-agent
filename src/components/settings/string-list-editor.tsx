"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface StringListEditorProps {
  label: string;
  description?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  emptyHint?: string;
  /** Return error message or null if valid */
  validate?: (value: string) => string | null;
  inputType?: "text" | "url";
  mono?: boolean;
}

export function StringListEditor({
  label,
  description,
  items,
  onChange,
  placeholder,
  addLabel = "Add",
  emptyHint = "No items yet — add one below.",
  validate,
  inputType = "text",
  mono = false,
}: StringListEditorProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function addItem() {
    const value = draft.trim();
    if (!value) {
      setError("Enter a value first.");
      return;
    }
    if (validate) {
      const msg = validate(value);
      if (msg) {
        setError(msg);
        return;
      }
    }
    if (items.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError("Already in the list.");
      return;
    }
    onChange([...items, value]);
    setDraft("");
    setError("");
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
            >
              <span
                className={cn(
                  "min-w-0 flex-1 break-all text-xs text-foreground/90",
                  mono && "font-mono"
                )}
              >
                <span className="mr-2 text-[10px] font-medium uppercase text-muted-foreground">
                  #{index + 1}
                </span>
                {item}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeAt(index)}
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Input
          type={inputType}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className={cn(mono && "font-mono text-xs")}
        />
        <Button type="button" variant="secondary" className="shrink-0 gap-1.5" onClick={addItem}>
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
