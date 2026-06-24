import { DEFAULT_LLM_BASE_URL } from "@/lib/llm-config";

export interface LlmProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  keyHint: string;
  description: string;
  /** Example chat model IDs for this provider */
  exampleModels: string[];
}

/** OpenAI-compatible API presets — paste API key from each provider's developer console. */
export const LLM_PROVIDER_PRESETS: LlmProviderPreset[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: DEFAULT_LLM_BASE_URL,
    keyHint: "sk-or-…",
    description: "One key for 200+ models (Hermes, Claude, GPT, Gemini, free tiers). Recommended.",
    exampleModels: [
      "nousresearch/hermes-3-llama-3.1-405b:free",
      "google/gemma-4-31b-it:free",
      "anthropic/claude-fable-5",
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyHint: "sk-…",
    description:
      "Direct OpenAI API. ChatGPT Plus / Team subscription does NOT include API — create a key at platform.openai.com.",
    exampleModels: ["gpt-4.1-mini", "gpt-4.1", "o4-mini"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    keyHint: "sk-ant-…",
    description:
      "Direct Anthropic API. Claude Pro subscription ≠ API — create a key at console.anthropic.com.",
    exampleModels: ["claude-opus-4-20250514", "claude-sonnet-4-20250514"],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keyHint: "AI…",
    description: "Gemini via OpenAI-compatible endpoint. Keys from Google AI Studio.",
    exampleModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keyHint: "gsk_…",
    description: "Fast inference. Keys from console.groq.com.",
    exampleModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    keyHint: "…",
    description: "Open models at scale. Keys from api.together.xyz.",
    exampleModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    keyHint: "sk-…",
    description: "DeepSeek chat models. Keys from platform.deepseek.com.",
    exampleModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    keyHint: "ollama (any)",
    description: "Run models locally. Start Ollama, then pull a model (e.g. llama3.2).",
    exampleModels: ["llama3.2", "qwen2.5", "hermes3"],
  },
  {
    id: "custom",
    name: "Custom endpoint",
    baseUrl: "",
    keyHint: "provider key",
    description: "Any OpenAI-compatible /v1/chat/completions endpoint.",
    exampleModels: [],
  },
];

export function detectLlmProviderId(baseUrl: string | null | undefined): string {
  const url = (baseUrl || DEFAULT_LLM_BASE_URL).trim().toLowerCase();
  if (!url || url.includes("openrouter.ai")) return "openrouter";
  if (url.includes("api.openai.com")) return "openai";
  if (url.includes("anthropic.com")) return "anthropic";
  if (url.includes("generativelanguage.googleapis.com") || url.includes("googleapis.com"))
    return "gemini";
  if (url.includes("groq.com")) return "groq";
  if (url.includes("together.xyz")) return "together";
  if (url.includes("deepseek.com")) return "deepseek";
  if (url.includes("localhost:11434") || url.includes("ollama")) return "ollama";
  return "custom";
}

export function getLlmProviderPreset(id: string): LlmProviderPreset {
  return LLM_PROVIDER_PRESETS.find((p) => p.id === id) ?? LLM_PROVIDER_PRESETS[0];
}
