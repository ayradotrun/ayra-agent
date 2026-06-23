"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectLlmProviderId,
  getLlmProviderPreset,
  LLM_PROVIDER_PRESETS,
} from "@/lib/llm-providers";
import { DEFAULT_LLM_BASE_URL } from "@/lib/llm-config";

interface LlmProviderPickerProps {
  baseUrl: string;
  onBaseUrlChange: (url: string) => void;
}

export function LlmProviderPicker({ baseUrl, onBaseUrlChange }: LlmProviderPickerProps) {
  const providerId = detectLlmProviderId(baseUrl || null);
  const preset = getLlmProviderPreset(providerId);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Provider</Label>
        <Select
          value={providerId}
          onValueChange={(id) => {
            const next = getLlmProviderPreset(id);
            if (id === "custom") return;
            onBaseUrlChange(next.baseUrl);
          }}
        >
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
      </div>

      {providerId === "custom" && (
        <p className="text-xs text-muted-foreground">
          Set your custom base URL below (must end with <code>/v1</code>).
        </p>
      )}

      {preset.exampleModels.length > 0 && (
        <div className="rounded-md border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground/90">Example model IDs</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 font-mono text-[11px]">
            {preset.exampleModels.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {baseUrl && baseUrl !== DEFAULT_LLM_BASE_URL && providerId !== "custom" && (
        <p className="text-[11px] text-muted-foreground">
          Active endpoint: <code className="text-foreground/80">{baseUrl}</code>
        </p>
      )}
    </div>
  );
}
