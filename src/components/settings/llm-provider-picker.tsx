"use client";

import { memo, useCallback } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLlmProviderPreset, LLM_PROVIDER_PRESETS } from "@/lib/llm-providers";

interface LlmProviderPickerProps {
  providerId: string;
  onProviderChange: (id: string) => void;
}

function LlmProviderPickerInner({ providerId, onProviderChange }: LlmProviderPickerProps) {
  const preset = getLlmProviderPreset(providerId);

  const handleChange = useCallback(
    (id: string) => {
      onProviderChange(id);
    },
    [onProviderChange]
  );

  return (
    <div className="space-y-2">
      <Label>Provider</Label>
      <Select value={providerId} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LLM_PROVIDER_PRESETS.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{preset.description}</p>
      {providerId === "custom" && (
        <p className="text-xs text-muted-foreground">
          Set your custom base URL below (OpenAI-compatible, usually ends with <code>/v1</code>).
        </p>
      )}
    </div>
  );
}

export const LlmProviderPicker = memo(LlmProviderPickerInner);
