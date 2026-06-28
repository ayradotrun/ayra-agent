import { isFreeModel, MODEL_OPTIONS, type ModelTier } from "@/lib/models";

/** USD per 1M tokens — rough OpenRouter averages by tier */
const TIER_RATES: Record<ModelTier, { input: number; output: number }> = {
  free: { input: 0, output: 0 },
  "image-free": { input: 0, output: 0 },
  image: { input: 2.5, output: 10 },
  standard: { input: 0.8, output: 3.2 },
  premium: { input: 3, output: 15 },
};

function tierForModel(model: string): ModelTier {
  const preset = MODEL_OPTIONS.find((m) => m.value === model);
  if (preset) return preset.tier;
  if (isFreeModel(model)) return "free";
  if (model.includes("opus") || (model.includes("gpt-5.4") && !model.includes("mini"))) return "premium";
  return "standard";
}

export function estimateTokenCostUsd(
  inputTokens: number,
  outputTokens: number,
  model?: string | null
): number {
  const id = model?.trim() || "";
  if (!inputTokens && !outputTokens) return 0;
  if (isFreeModel(id)) return 0;

  const tier = tierForModel(id);
  const rates = TIER_RATES[tier];
  const cost =
    (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

export function formatCostUsd(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("en-US");
}
