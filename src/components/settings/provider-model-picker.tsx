"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { ProviderModelOption } from "@/lib/llm/provider-models";

interface ProviderModelPickerProps {
  label: string;
  value: string;
  onChange: (model: string) => void;
  models: ProviderModelOption[];
  emptyMessage?: string;
}

export function ProviderModelPicker({
  label,
  value,
  onChange,
  models,
  emptyMessage = "No models available.",
}: ProviderModelPickerProps) {
  const inList = models.some((m) => m.value === value);
  const selectValue = inList ? value : models[0]?.value ?? "__custom__";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {models.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <Select
          value={selectValue}
          onValueChange={(v) => {
            if (v !== "__custom__") onChange(v);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
            {!inList && value && (
              <SelectItem value="__custom__" disabled>
                Custom: {value}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Model ID"
        className="font-mono text-xs"
        spellCheck={false}
      />
    </div>
  );
}
