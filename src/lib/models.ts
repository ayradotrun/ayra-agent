/** OpenRouter model presets + custom model helpers */

export type ModelTier = "free" | "image-free" | "image" | "standard" | "premium";

export interface ModelOption {
  value: string;
  label: string;
  tier: ModelTier;
}

export const CUSTOM_MODEL_VALUE = "__custom__";

/** Latest verified free chat models (:free on OpenRouter) — one per family, largest size */
const FREE_MODELS: ModelOption[] = [
  { value: "qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen3 Next 80B", tier: "free" },
  { value: "qwen/qwen3-coder:free", label: "Qwen3 Coder", tier: "free" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", tier: "free" },
  { value: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B", tier: "free" },
  { value: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra 550B", tier: "free" },
  { value: "google/gemma-4-31b-it:free", label: "Gemma 4 31B", tier: "free" },
  { value: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Nous 405B · Free", tier: "free" },
  { value: "nex-agi/nex-n2-pro:free", label: "Nex N2 Pro", tier: "free" },
];

/** Image generation — $0 token pricing on OpenRouter (Riverflow) */
const IMAGE_FREE_MODELS: ModelOption[] = [
  { value: "sourceful/riverflow-v2.5-pro", label: "Riverflow 2.5 Pro", tier: "image-free" },
  { value: "black-forest-labs/flux.2-klein-4b", label: "FLUX.2 Klein 4B", tier: "image-free" },
];

/** Latest paid image models */
const IMAGE_MODELS: ModelOption[] = [
  { value: "google/gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image", tier: "image" },
  { value: "google/gemini-3-pro-image", label: "Gemini 3 Pro Image", tier: "image" },
  { value: "openai/gpt-5.4-image-2", label: "GPT-5.4 Image 2", tier: "image" },
  { value: "black-forest-labs/flux.2-max", label: "FLUX.2 Max", tier: "image" },
  { value: "bytedance-seed/seedream-4.5", label: "Seedream 4.5", tier: "image" },
];

/** Latest paid chat models */
const STANDARD_MODELS: ModelOption[] = [
  { value: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash", tier: "standard" },
  { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", tier: "standard" },
  { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", tier: "standard" },
  { value: "qwen/qwen3.6-flash", label: "Qwen3.6 Flash", tier: "standard" },
  { value: "minimax/minimax-m3", label: "MiniMax M3", tier: "standard" },
  { value: "anthropic/claude-fable-5", label: "Claude Fable 5", tier: "standard" },
  { value: "z-ai/glm-5.2", label: "GLM 5.2", tier: "standard" },
  { value: "nousresearch/hermes-4-405b", label: "Nous 405B · Paid", tier: "standard" },
];

const PREMIUM_MODELS: ModelOption[] = [
  { value: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8", tier: "premium" },
  { value: "openai/gpt-5.4", label: "GPT-5.4", tier: "premium" },
  { value: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", tier: "premium" },
  { value: "x-ai/grok-4.3", label: "Grok 4.3", tier: "premium" },
];

export const CHAT_MODEL_OPTIONS: ModelOption[] = [
  ...FREE_MODELS,
  ...STANDARD_MODELS,
  ...PREMIUM_MODELS,
];

export const IMAGE_MODEL_OPTIONS: ModelOption[] = [...IMAGE_FREE_MODELS, ...IMAGE_MODELS];

export const MODEL_OPTIONS: ModelOption[] = [
  ...FREE_MODELS,
  ...IMAGE_FREE_MODELS,
  ...IMAGE_MODELS,
  ...STANDARD_MODELS,
  ...PREMIUM_MODELS,
];

export const DEFAULT_MODEL = "google/gemma-4-31b-it:free";
/** Stronger but slower — use via Settings or `/model hermes` */
export const REASONING_DEFAULT_MODEL = "nousresearch/hermes-3-llama-3.1-405b:free";
export const DEFAULT_IMAGE_MODEL = "sourceful/riverflow-v2.5-pro";

/** Old DB/env defaults that require OpenRouter credits */
export const LEGACY_PAID_DEFAULTS = new Set([
  "deepseek/deepseek-chat",
  "deepseek/deepseek-v3",
]);

/** Free models to try when primary is rate-limited (429) or misconfigured as paid (402) */
export const FREE_MODEL_FALLBACK_CHAIN: string[] = [
  "qwen/qwen3-coder:free",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-20b:free",
  "openai/gpt-oss-120b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
];

export const MODEL_TIER_LABELS: Record<ModelTier, string> = {
  free: "Free",
  "image-free": "Image · Free",
  image: "Image",
  standard: "Paid",
  premium: "Premium",
};

export function isPresetModel(model: string | null | undefined): boolean {
  if (!model) return false;
  return MODEL_OPTIONS.some((m) => m.value === model);
}

export function isImageModel(model: string): boolean {
  return IMAGE_MODEL_OPTIONS.some((m) => m.value === model);
}

export function normalizeModelId(model: string): string {
  return model.trim();
}

export function isValidModelId(model: string): boolean {
  const id = normalizeModelId(model);
  if (id.length < 1 || id.length > 120) return false;
  if (id.includes("/")) {
    const [provider, ...rest] = id.split("/");
    return provider.length >= 1 && rest.join("/").length >= 1;
  }
  return /^[a-zA-Z0-9._:@-]+$/.test(id);
}

export function getModelLabel(model: string): string {
  const preset = MODEL_OPTIONS.find((m) => m.value === model);
  if (preset) return preset.label;
  const short = model.split("/").pop() || model;
  return `Custom: ${short}`;
}

export function resolveModelSelectValue(model: string | undefined): string {
  const m = model || DEFAULT_MODEL;
  return isPresetModel(m) ? m : CUSTOM_MODEL_VALUE;
}

export function isFreeModel(model: string): boolean {
  return model.endsWith(":free") || FREE_MODELS.some((m) => m.value === model);
}

export function normalizeChatModel(model: string | null | undefined): string {
  const id = model ? normalizeModelId(model) : "";
  if (!id || LEGACY_PAID_DEFAULTS.has(id)) {
    return DEFAULT_MODEL;
  }
  return id;
}

export function getImageModelFallbackChain(primary: string, userFallbacks?: string[] | null): string[] {
  const normalized = normalizeModelId(primary) || primary.trim();
  const extras = (userFallbacks ?? [])
    .map((m) => normalizeModelId(m))
    .filter((m) => m && isValidModelId(m));
  return Array.from(new Set([normalized, ...extras].filter(Boolean)));
}

export function getChatModelFallbackChain(
  primary: string,
  userFallbacks?: string[] | null
): string[] {
  const normalized = normalizeChatModel(primary);
  const extras = (userFallbacks ?? [])
    .map((m) => normalizeChatModel(m))
    .filter((m) => m && isValidModelId(m));

  if (extras.length > 0) {
    return Array.from(new Set([normalized, ...extras]));
  }

  // Only the primary model unless user configured fallbacks in Settings → LLM
  return [normalized];
}

export function getFreeModelFallbackChain(primary: string, userFallbacks?: string[] | null): string[] {
  const normalized = normalizeChatModel(primary);
  const extras = (userFallbacks ?? [])
    .map((m) => normalizeChatModel(m))
    .filter((m) => m && isValidModelId(m));
  const chain = [
    normalized,
    ...extras,
    ...FREE_MODEL_FALLBACK_CHAIN.filter((m) => m !== normalized),
    DEFAULT_MODEL,
  ];
  return Array.from(new Set(chain));
}

/** @deprecated use getFreeModelFallbackChain */
export function getModelFallbackChain(primary: string, userFallbacks?: string[] | null): string[] {
  return getFreeModelFallbackChain(primary, userFallbacks);
}

/** If a :free variant exists for this model ID, return it */
export function suggestFreeModelVariant(model: string): string | null {
  const id = normalizeModelId(model);
  if (id.endsWith(":free")) return null;
  const withFree = `${id}:free`;
  if (MODEL_OPTIONS.some((m) => m.value === withFree)) return withFree;
  return null;
}

function pickBestModelMatch(matches: ModelOption[]): ModelOption | null {
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  const freeMatch = matches.find((m) => m.tier === "free" || m.value.endsWith(":free"));
  return freeMatch ?? matches[0];
}

export function getImageModalities(model: string): ("image" | "text")[] {
  const imageOnly =
    model.startsWith("sourceful/") ||
    model.startsWith("black-forest-labs/") ||
    model.startsWith("recraft/") ||
    model.startsWith("bytedance-seed/");
  return imageOnly ? ["image"] : ["image", "text"];
}

export function resolveModelQuery(
  query: string,
  options: ModelOption[] = MODEL_OPTIONS
): ModelOption | null {
  const raw = query.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const exact = options.find((m) => m.value.toLowerCase() === lower);
  if (exact) return exact;

  const byLabel = options.filter((m) => m.label.toLowerCase().includes(lower));
  const labelMatch = pickBestModelMatch(byLabel);
  if (labelMatch) return labelMatch;

  const byValue = options.filter((m) => m.value.toLowerCase().includes(lower));
  const valueMatch = pickBestModelMatch(byValue);
  if (valueMatch) return valueMatch;

  if (isValidModelId(raw)) {
    const id = normalizeModelId(raw);
    const preset = options.find((m) => m.value === id);
    if (preset) return preset;
    return { value: id, label: getModelLabel(id), tier: "free" };
  }

  return null;
}

export function formatTelegramModelList(options: ModelOption[]): string {
  const tiers: ModelTier[] = ["free", "image-free", "image", "standard", "premium"];
  const lines: string[] = ["*Available models*\n"];

  for (const tier of tiers) {
    const group = options.filter((m) => m.tier === tier);
    if (group.length === 0) continue;
    lines.push(`*${MODEL_TIER_LABELS[tier]}*`);
    for (const m of group) {
      lines.push(`• ${m.label} — \`${m.value}\``);
    }
    lines.push("");
  }

  lines.push("Preset chat: `/model [name]`");
  lines.push("Custom chat: `/custommodel [provider/model-id]`");
  lines.push("Preset image: `/imagemodel [name]`");
  lines.push("Custom image: `/customimagemodel [provider/model-id]`");
  lines.push("Generate: `/image [prompt]`");

  return lines.join("\n").slice(0, 4000);
}
