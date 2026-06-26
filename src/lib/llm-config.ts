import { DEFAULT_MODEL, normalizeChatModel } from "@/lib/models";

export const DEFAULT_LLM_BASE_URL = "https://openrouter.ai/api/v1";

export interface LlmUserFields {
  llmBaseUrl?: string | null;
  defaultModel?: string | null;
  fallbackModels?: string[] | null;
  fallbackImageModels?: string[] | null;
}

export function normalizeLlmBaseUrl(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (u.endsWith("/chat/completions")) {
    u = u.slice(0, -"/chat/completions".length).replace(/\/+$/, "");
  }
  return u;
}

export function resolveLlmBaseUrl(userUrl?: string | null): string {
  const fromUser = userUrl?.trim();
  if (fromUser) return normalizeLlmBaseUrl(fromUser);
  const fromEnv = process.env.LLM_BASE_URL?.trim();
  if (fromEnv) return normalizeLlmBaseUrl(fromEnv);
  return DEFAULT_LLM_BASE_URL;
}

export function buildChatCompletionsUrl(baseUrl: string): string {
  const base = normalizeLlmBaseUrl(baseUrl);
  return `${base}/chat/completions`;
}

export function isOpenRouterBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(normalizeLlmBaseUrl(baseUrl)).hostname.toLowerCase();
    return host === "openrouter.ai" || host.endsWith(".openrouter.ai");
  } catch {
    return baseUrl.toLowerCase().includes("openrouter.ai");
  }
}

/** Direct OpenAI API — newer models require max_completion_tokens instead of max_tokens. */
export function isOpenAiDirectBaseUrl(baseUrl: string): boolean {
  try {
    const host = new URL(normalizeLlmBaseUrl(baseUrl)).hostname.toLowerCase();
    return host === "api.openai.com";
  } catch {
    return baseUrl.toLowerCase().includes("api.openai.com");
  }
}

/** Token limit field for chat/completions — OpenAI direct vs other OpenAI-compatible APIs. */
export function buildCompletionTokenFields(
  baseUrl: string,
  maxTokens: number
): { max_tokens: number } | { max_completion_tokens: number } {
  if (isOpenAiDirectBaseUrl(baseUrl)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

export function getLlmApiKey(userKey?: string | null): string {
  const key = userKey || process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("LLM API key not configured. Add it in Settings → LLM.");
  }
  return key;
}

/** @deprecated Use getLlmApiKey */
export function getOpenRouterKey(userKey?: string | null): string {
  return getLlmApiKey(userKey);
}

export function buildLlmCallParams(
  user: LlmUserFields,
  decryptedApiKey: string | null | undefined,
  modelOverride?: string | null
) {
  const baseUrl = resolveLlmBaseUrl(user.llmBaseUrl);
  return {
    baseUrl,
    apiKey: getLlmApiKey(decryptedApiKey),
    model:
      modelOverride ??
      normalizeChatModel(
        user.defaultModel || process.env.LLM_MODEL || process.env.OPENROUTER_MODEL || DEFAULT_MODEL
      ),
    useOpenRouterFallbacks: isOpenRouterBaseUrl(baseUrl),
    fallbackModels: user.fallbackModels ?? [],
    fallbackImageModels: user.fallbackImageModels ?? [],
  };
}

export function isValidLlmBaseUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 500) return false;
  try {
    const parsed = new URL(trimmed.replace(/\/chat\/completions\/?$/, ""));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
