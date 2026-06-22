"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_MODEL,
  MODEL_TIER_LABELS,
  getModelLabel,
  type ModelTier,
} from "@/lib/models";
import { cn } from "@/lib/utils";

const CHAT_TIERS: ModelTier[] = ["free", "standard", "premium"];
const DEFAULT_VALUE = "__default__";

interface ChatModelSelectProps {
  value: string;
  defaultModel?: string;
  onChange: (model: string | null) => void;
  disabled?: boolean;
  variant?: "default" | "inline";
}

export function ChatModelSelect({
  value,
  defaultModel = DEFAULT_MODEL,
  onChange,
  disabled,
  variant = "default",
}: ChatModelSelectProps) {
  const selectValue = value || DEFAULT_VALUE;
  const label =
    selectValue === DEFAULT_VALUE
      ? getModelLabel(defaultModel)
      : getModelLabel(selectValue);

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onChange(v === DEFAULT_VALUE ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          variant === "inline"
            ? "h-7 max-w-[min(160px,42vw)] rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 text-[11px] font-medium shadow-none hover:bg-white/[0.06] focus:ring-0 [&>span]:line-clamp-1 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60"
            : "h-8 max-w-[200px] text-xs"
        )}
      >
        <SelectValue placeholder="Model">
          {label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        <SelectItem value={DEFAULT_VALUE}>
          Default · {getModelLabel(defaultModel)}
        </SelectItem>
        {CHAT_TIERS.map((tier) => {
          const group = CHAT_MODEL_OPTIONS.filter((m) => m.tier === tier);
          if (group.length === 0) return null;
          return (
            <div key={tier}>
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {MODEL_TIER_LABELS[tier]}
              </p>
              {group.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );
}
