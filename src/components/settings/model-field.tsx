"use client";

import { Label } from "@/components/ui/label";
import { ModelCombobox } from "@/components/settings/model-combobox";
import type { ProviderModelOption } from "@/lib/llm/provider-models";

interface ModelFieldProps {
  label: string;
  value: string;
  onChange: (model: string) => void;
  models: ProviderModelOption[];
  emptyHint?: string;
}

export function ModelField({
  label,
  value,
  onChange,
  models,
  emptyHint = "Search or type model ID…",
}: ModelFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <ModelCombobox value={value} onChange={onChange} models={models} placeholder={emptyHint} />
    </div>
  );
}
