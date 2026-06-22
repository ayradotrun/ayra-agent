import { suggestFreeModelVariant, getFreeModelFallbackChain, isFreeModel } from "@/lib/models";
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
  reasoning?: OpenRouterReasoningConfig;
}): Promise<OpenRouterResponse> {
  const baseUrl = params.baseUrl ?? DEFAULT_LLM_BASE_URL;
  const useFallbacks =
    (params.useOpenRouterFallbacks ?? isOpenRouterBaseUrl(baseUrl)) && !params.reasoning;
  const modelsToTry = useFallbacks ? getFreeModelFallbackChain(params.model) : [params.model];
  let lastStatus = 500;
  let lastBody = "Unknown error";
  let lastModel = params.model;

  for (const model of modelsToTry) {
    const result = await callOpenRouterOnce({ ...params, baseUrl, model });
    if (result.ok) {
      return result.data;
    }

    lastStatus = result.status;
    lastBody = result.body;
    lastModel = model;

    if (!useFallbacks || !shouldRetryWithFreeFallback(result.status, model)) {
      break;
    }

    const hasNext = modelsToTry.indexOf(model) < modelsToTry.length - 1;
    if (!hasNext) break;
  }

  throw new Error(formatLlmError(lastStatus, lastBody, lastModel, baseUrl));
}

export async function callOpenRouterImageGeneration(params: {
  apiKey: string;
  baseUrl?: string;
  model: string;
  prompt: string;
  modalities: ("image" | "text")[];
  aspectRatio?: string;
  useOpenRouterFallbacks?: boolean;
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

