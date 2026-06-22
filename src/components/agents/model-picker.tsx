"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_MODEL,
  MODEL_OPTIONS,
  MODEL_TIER_LABELS,
  isPresetModel,
  isValidModelId,
  normalizeModelId,
  type ModelTier,
} from "@/lib/models";

interface ModelPickerProps {
  value: string;
  onChange: (model: string) => void;
  label?: string;
  showHint?: boolean;
  /** Show only these tiers (default: all) */
  tiers?: ModelTier[];
  /** Default preset when value is a custom ID */
  presetFallback?: string;
  customLabel?: string;
}

const ALL_TIER_ORDER: ModelTier[] = ["free", "image-free", "image", "standard", "premium"];

function effectiveModel(preset: string, custom: string): string {
  const trimmed = normalizeModelId(custom);
  return trimmed || preset;
}

export function ModelPicker({
  value,
  onChange,
  label = "Model",
  showHint = true,
  tiers = ALL_TIER_ORDER,
  presetFallback = DEFAULT_MODEL,
  customLabel = "Custom model (optional)",
}: ModelPickerProps) {
  const model = value || presetFallback;
  const options = MODEL_OPTIONS.filter((m) => tiers.includes(m.tier));
  const defaultPreset = options[0]?.value ?? presetFallback;

  const [preset, setPreset] = useState(() =>
    isPresetModel(model) && options.some((m) => m.value === model) ? model : defaultPreset
  );
  const [customModel, setCustomModel] = useState(() =>
    isPresetModel(model) ? "" : model
  );

  useEffect(() => {
    if (isPresetModel(model) && options.some((m) => m.value === model)) {
      setPreset(model);
      setCustomModel("");
    } else if (!isPresetModel(model)) {
      setCustomModel(model);
    }
  }, [model, options]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={preset}
        onValueChange={(v) => {
          setPreset(v);
          onChange(effectiveModel(v, customModel));
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {tiers.map((tier) => {
            const group = options.filter((m) => m.tier === tier);
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

      <div className="space-y-1">
        <Label className="text-xs font-normal text-muted-foreground">{customLabel}</Label>
        <Input
          value={customModel}
          onChange={(e) => {
            const next = e.target.value;
            setCustomModel(next);
            onChange(effectiveModel(preset, next));
          }}
          placeholder="provider/model-id"
          spellCheck={false}
        />
        {customModel && !isValidModelId(customModel) && (
          <p className="text-xs text-amber-500/90">
            Use OpenRouter format: provider/model-id
          </p>
        )}
        {customModel && isValidModelId(customModel) && (
          <p className="text-xs text-muted-foreground">
            Using custom model instead of preset above.
          </p>
        )}
      </div>

      {showHint && (
        <p className="text-xs text-muted-foreground">
          Chat: <strong>Free</strong> = $0 (suffix <code className="text-[11px]">:free</code>).
          Images: use <strong>Image · Free</strong> models or skill <strong>image-generator</strong>.
          Browse{" "}
          <a
            href="https://openrouter.ai/models"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            openrouter.ai/models
          </a>
          .
        </p>
      )}
    </div>
  );
}
