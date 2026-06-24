import type { ModelOption } from "@/lib/models";

export type ProviderModelType = "chat" | "image";

export interface ProviderModelOption {
  value: string;
  label: string;
  type: ProviderModelType;
}

const OPENAI_CHAT: ProviderModelOption[] = [
  { value: "gpt-5", label: "GPT-5", type: "chat" },
  { value: "gpt-5-mini", label: "GPT-5 Mini", type: "chat" },
  { value: "gpt-4.1", label: "GPT-4.1", type: "chat" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", type: "chat" },
  { value: "o4-mini", label: "o4 Mini", type: "chat" },
];

const OPENAI_IMAGE: ProviderModelOption[] = [
  { value: "gpt-image-1", label: "GPT Image", type: "image" },
  { value: "dall-e-3", label: "DALL-E 3", type: "image" },
];

const ANTHROPIC_CHAT: ProviderModelOption[] = [
  { value: "claude-opus-4-20250514", label: "Claude Opus", type: "chat" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet", type: "chat" },
  { value: "claude-3-5-haiku-20241022", label: "Claude Haiku", type: "chat" },
];

const GEMINI_CHAT: ProviderModelOption[] = [
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", type: "chat" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", type: "chat" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", type: "chat" },
];

const GEMINI_IMAGE: ProviderModelOption[] = [
  { value: "gemini-2.0-flash-preview-image-generation", label: "Gemini Image", type: "image" },
];

const GROQ_CHAT: ProviderModelOption[] = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", type: "chat" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", type: "chat" },
];

const DEEPSEEK_CHAT: ProviderModelOption[] = [
  { value: "deepseek-chat", label: "DeepSeek Chat", type: "chat" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner", type: "chat" },
];

const TOGETHER_CHAT: ProviderModelOption[] = [
  { value: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B Turbo", type: "chat" },
];

const OLLAMA_CHAT: ProviderModelOption[] = [
  { value: "llama3.2", label: "Llama 3.2", type: "chat" },
  { value: "qwen2.5", label: "Qwen 2.5", type: "chat" },
  { value: "hermes3", label: "Hermes 3", type: "chat" },
];

const OPENROUTER_CHAT: ProviderModelOption[] = [
  { value: "google/gemma-4-31b-it:free", label: "Gemma 4 31B (free)", type: "chat" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (free)", type: "chat" },
  { value: "anthropic/claude-fable-5", label: "Claude Fable 5", type: "chat" },
  { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", type: "chat" },
];

const OPENROUTER_IMAGE: ProviderModelOption[] = [
  { value: "sourceful/riverflow-v2.5-pro", label: "Riverflow 2.5 Pro", type: "image" },
  { value: "google/gemini-3.1-flash-image", label: "Gemini 3.1 Flash Image", type: "image" },
];

const PROVIDER_STATIC: Record<string, { chat: ProviderModelOption[]; image: ProviderModelOption[] }> = {
  openrouter: { chat: OPENROUTER_CHAT, image: OPENROUTER_IMAGE },
  openai: { chat: OPENAI_CHAT, image: OPENAI_IMAGE },
  anthropic: { chat: ANTHROPIC_CHAT, image: [] },
  gemini: { chat: GEMINI_CHAT, image: GEMINI_IMAGE },
  groq: { chat: GROQ_CHAT, image: [] },
  deepseek: { chat: DEEPSEEK_CHAT, image: [] },
  together: { chat: TOGETHER_CHAT, image: [] },
  ollama: { chat: OLLAMA_CHAT, image: [] },
  custom: { chat: [], image: [] },
};

export function getStaticProviderModels(
  providerId: string,
  type: ProviderModelType
): ProviderModelOption[] {
  const bucket = PROVIDER_STATIC[providerId] ?? PROVIDER_STATIC.custom;
  return type === "chat" ? bucket.chat : bucket.image;
}

export function mergeCustomModels(
  staticModels: ProviderModelOption[],
  customModels: Array<{ modelName: string; modelId: string; modelType: string; provider: string }>,
  providerId: string,
  type: ProviderModelType
): ProviderModelOption[] {
  const custom = customModels
    .filter((m) => m.modelType === type && (m.provider === providerId || m.provider === "all"))
    .map((m) => ({ value: m.modelId, label: `${m.modelName} (custom)`, type }));

  const seen = new Set<string>();
  const merged: ProviderModelOption[] = [];
  for (const m of [...staticModels, ...custom]) {
    if (seen.has(m.value)) continue;
    seen.add(m.value);
    merged.push(m);
  }
  return merged;
}

export function toModelOptions(models: ProviderModelOption[]): ModelOption[] {
  return models.map((m) => ({
    value: m.value,
    label: m.label,
    tier: m.type === "image" ? "image" : "standard",
  }));
}

export async function fetchOpenRouterModels(apiKey?: string): Promise<ProviderModelOption[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers,
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`OpenRouter models HTTP ${res.status}`);

  const data = (await res.json()) as {
    data?: Array<{ id?: string; name?: string; architecture?: { output_modalities?: string[] } }>;
  };

  return (data.data ?? [])
    .filter((m) => m.id)
    .slice(0, 120)
    .map((m) => {
      const image = m.architecture?.output_modalities?.includes("image");
      return {
        value: m.id!,
        label: m.name || m.id!,
        type: (image ? "image" : "chat") as ProviderModelType,
      };
    });
}

export async function fetchCustomEndpointModels(
  baseUrl: string,
  apiKey?: string
): Promise<ProviderModelOption[]> {
  const base = baseUrl.replace(/\/$/, "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${base}/models`, {
    headers,
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Custom models HTTP ${res.status}`);

  const data = (await res.json()) as {
    data?: Array<{ id?: string; name?: string }>;
  };

  return (data.data ?? [])
    .filter((m) => m.id)
    .slice(0, 120)
    .map((m) => ({
      value: m.id!,
      label: m.name || m.id!,
      type: "chat" as ProviderModelType,
    }));
}
