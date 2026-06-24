import {
  suggestFreeModelVariant,
  getFreeModelFallbackChain,
  getChatModelFallbackChain,
  getImageModelFallbackChain,
  isFreeModel,
} from "@/lib/models";
import { FailoverReason, classifyApiError } from "@/lib/agent/error-classifier";
import { sleepMs } from "@/lib/agent/retry";
import {
  buildChatCompletionsUrl,
  DEFAULT_LLM_BASE_URL,
  isOpenRouterBaseUrl,
} from "@/lib/llm-config";

export { getLlmApiKey, getOpenRouterKey } from "@/lib/llm-config";

export type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type OpenRouterMessageContent = string | OpenRouterContentPart[];

export function messageContentToString(content: OpenRouterMessageContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

export interface OpenRouterReasoningConfig {
  effort?: "xhigh" | "high" | "medium" | "low" | "minimal" | "none";
  max_tokens?: number;
  exclude?: boolean;
  enabled?: boolean;
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: OpenRouterMessageContent;
  tool_call_id?: string;
  name?: string;
}

export interface OpenRouterTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      reasoning?: string | null;
      images?: Array<{
        image_url?: { url: string };
        imageUrl?: { url: string };
      }>;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterImageResult {
  text?: string;
  images: Array<{ dataUrl: string }>;
}

function formatLlmError(status: number, body: string, model?: string, baseUrl?: string): string {
  const provider = baseUrl && isOpenRouterBaseUrl(baseUrl) ? "OpenRouter" : "LLM provider";
  if (status === 402) {
    const freeVariant = model ? suggestFreeModelVariant(model) : null;
    const parts = [
      model ? `Model \`${model}\` requires ${provider} credits.` : `${provider} account has no credits.`,
    ];
    if (baseUrl && isOpenRouterBaseUrl(baseUrl)) {
      if (model && isFreeModel(model)) {
        parts.push("Free model is routing to a paid provider — try another free model via `/model gemma`.");
      } else if (model?.includes("hermes") && !model.endsWith(":free")) {
        parts.push("Free alternative: `nousresearch/hermes-3-llama-3.1-405b:free`.");
      } else if (freeVariant) {
        parts.push(`Free variant: \`${freeVariant}\`.`);
      }
      parts.push("Top-up: https://openrouter.ai/settings/credits");
    }
    return parts.join(" ");
  }

  if (status === 429) {
    if (baseUrl && isOpenRouterBaseUrl(baseUrl)) {
      return `Model \`${model}\` is rate-limited on OpenRouter. Try again shortly or switch model: \`/model gemma\`.`;
    }
    return `Model \`${model}\` is rate-limited. Try again shortly or switch model.`;
  }

  return `${provider} API error: ${status} - ${body}`;
}

function shouldRetryWithFreeFallback(status: number, model: string): boolean {
  if (status === 402) return !isFreeModel(model) || model.includes("deepseek");
  if (status === 429) return isFreeModel(model) || model.endsWith(":free");
  return false;
}

const LLM_REQUEST_TIMEOUT_MS = parseInt(process.env.LLM_REQUEST_TIMEOUT_MS || "45000", 10);
const MAX_LLM_FALLBACK_ATTEMPTS = parseInt(process.env.MAX_LLM_FALLBACK_ATTEMPTS || "10", 10);

function isRotatableFailover(reason: FailoverReason): boolean {
  return (
    reason === FailoverReason.rateLimit ||
    reason === FailoverReason.overloaded ||
    reason === FailoverReason.billing ||
    reason === FailoverReason.modelNotFound ||
    reason === FailoverReason.serverError
  );
}

function buildModelsToTry(
  primary: string,
  fallbackModels: string[] | null | undefined,
  mode: "chat" | "image"
): string[] {
  if (mode === "image") {
    return getImageModelFallbackChain(primary, fallbackModels);
  }
  return getChatModelFallbackChain(primary, fallbackModels);
}

async function callOpenRouterOnce(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: OpenRouterMessage[];
  tools?: OpenRouterTool[];
  maxTokens?: number;
  modalities?: ("image" | "text")[];
  imageConfig?: { aspect_ratio?: string };
  reasoning?: OpenRouterReasoningConfig;
}): Promise<{ ok: true; data: OpenRouterResponse } | { ok: false; status: number; body: string }> {
  const baseUrl = params.baseUrl ?? DEFAULT_LLM_BASE_URL;
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    tools: params.tools,
    max_tokens: params.maxTokens ?? 2048,
  };
  if (params.modalities?.length) body.modalities = params.modalities;
  if (params.imageConfig) body.image_config = params.imageConfig;
  if (params.reasoning) body.reasoning = params.reasoning;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.apiKey}`,
    "Content-Type": "application/json",
  };
  if (isOpenRouterBaseUrl(baseUrl)) {
    headers["HTTP-Referer"] = process.env.NEXTAUTH_URL || "http://localhost:3000";
    headers["X-Title"] = "AYRA Agent";
  }

  const response = await fetch(buildChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LLM_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    return { ok: false, status: response.status, body: await response.text() };
  }

  return { ok: true, data: await response.json() };
}

export async function callOpenRouter(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  messages: OpenRouterMessage[];
  tools?: OpenRouterTool[];
  maxTokens?: number;
  modalities?: ("image" | "text")[];
  imageConfig?: { aspect_ratio?: string };
  useOpenRouterFallbacks?: boolean;
  fallbackModels?: string[] | null;
  fallbackMode?: "chat" | "image";
  reasoning?: OpenRouterReasoningConfig;
  /** Called with the model that produced a successful response */
  onModelUsed?: (model: string) => void;
  /** Called before trying the next fallback model (rate limit / overload) */
  onFallbackAttempt?: (model: string) => void;
}): Promise<OpenRouterResponse> {
  const baseUrl = params.baseUrl ?? DEFAULT_LLM_BASE_URL;
  const onOpenRouter = params.useOpenRouterFallbacks ?? isOpenRouterBaseUrl(baseUrl);
  const hasUserFallbacks = (params.fallbackModels?.length ?? 0) > 0;
  const canRotateModels = hasUserFallbacks && !params.reasoning;
  const mode = params.fallbackMode ?? "chat";
  const fullChain = canRotateModels
    ? buildModelsToTry(params.model, params.fallbackModels, mode)
    : [params.model];
  const maxAttempts = canRotateModels
    ? Math.min(fullChain.length, Math.max(MAX_LLM_FALLBACK_ATTEMPTS, fullChain.length))
    : 1;
  const modelsToTry = fullChain.slice(0, maxAttempts);

  let lastStatus = 500;
  let lastBody = "Unknown error";
  let lastModel = params.model;
  let attempt = 0;

  for (const model of modelsToTry) {
    attempt++;
    const result = await callOpenRouterOnce({ ...params, baseUrl, model });
    if (result.ok) {
      if (model !== params.model) {
        if (process.env.NODE_ENV !== "test") {
          console.info(
            `[llm] Primary model ${params.model} unavailable — used fallback ${model}`
          );
        }
      }
      params.onModelUsed?.(model);
      return result.data;
    }

    lastStatus = result.status;
    lastBody = result.body;
    lastModel = model;

    const classified = classifyApiError(result.status, result.body, { model });
    const hasMoreModels = attempt < modelsToTry.length;
    const mayTryNextModel =
      hasMoreModels &&
      classified.reason !== FailoverReason.authPermanent &&
      (isRotatableFailover(classified.reason) ||
        classified.shouldFallbackModel ||
        (hasUserFallbacks && classified.reason !== FailoverReason.contentPolicyBlocked) ||
        (onOpenRouter &&
          !params.reasoning &&
          classified.shouldRetry &&
          shouldRetryWithFreeFallback(result.status, model)));

    if (!canRotateModels || !mayTryNextModel) {
      if (classified.backoffMs && classified.shouldRetry && !mayTryNextModel) {
        await sleepMs(classified.backoffMs);
      }
      break;
    }

    const nextModel = modelsToTry[attempt];
    if (nextModel) {
      params.onFallbackAttempt?.(nextModel);
    }
  }

  const fallbackHint = hasUserFallbacks
    ? " Add or reorder fallback models in Settings → LLM."
    : onOpenRouter
      ? " Add fallback chat models in Settings → LLM, or retry later."
      : "";
  throw new Error(formatLlmError(lastStatus, lastBody, lastModel, baseUrl) + fallbackHint);
}

export async function callOpenRouterImageGeneration(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  prompt: string;
  modalities: ("image" | "text")[];
  aspectRatio?: string;
  useOpenRouterFallbacks?: boolean;
  fallbackModels?: string[] | null;
}): Promise<OpenRouterImageResult> {
  const response = await callOpenRouter({
    apiKey: params.apiKey,
    baseUrl: params.baseUrl,
    model: params.model,
    messages: [{ role: "user", content: params.prompt }],
    modalities: params.modalities,
    maxTokens: 4096,
    imageConfig: params.aspectRatio ? { aspect_ratio: params.aspectRatio } : undefined,
    useOpenRouterFallbacks: params.useOpenRouterFallbacks,
    fallbackModels: params.fallbackModels,
    fallbackMode: "image",
  });

  const message = response.choices[0]?.message;
  if (!message) {
    throw new Error("No response from image model");
  }

  const rawImages = message.images ?? [];
  const images = rawImages
    .map((img) => img.image_url?.url || img.imageUrl?.url)
    .filter((url): url is string => !!url)
    .map((dataUrl) => ({ dataUrl }));

  if (images.length === 0) {
    throw new Error(
      message.content ||
        "Model returned no images. Try a different image model or check OpenRouter credits."
    );
  }

  return {
    text: message.content || undefined,
    images,
  };
}

