const SETTINGS_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  defaultModel: "Default model",
  defaultImageModel: "Default image model",
  llmBaseUrl: "LLM base URL",
  llmProviderId: "LLM provider",
  llmApiKey: "LLM API key",
  openRouterApiKey: "OpenRouter API key",
  telegramBotToken: "Telegram bot token",
  telegramChatId: "Telegram chat ID",
  telegramDefaultAgentId: "Telegram default agent",
  solanaDefaultRpc: "Solana default RPC",
  solanaRpcApiKey: "Solana RPC API key",
  fallbackRpcUrls: "Fallback RPC URLs",
  brainDatabaseUrl: "Private database URL",
  fallbackModels: "Fallback models",
  fallbackImageModels: "Fallback image models",
  agentMemoryUrl: "Agent memory URL",
  jinaApiKey: "Jina API key",
  xApiKey: "X API key",
  xApiSecret: "X API secret",
  xAccessToken: "X access token",
  xAccessSecret: "X access secret",
};

export function getSettingsFieldLabel(field: string): string {
  return SETTINGS_FIELD_LABELS[field] ?? field;
}

export interface SettingsValidationError {
  field: string;
  label: string;
  message: string;
}

export function formatSettingsValidationErrors(
  issues: Array<{ path: readonly (string | number | symbol)[]; message: string }>
): SettingsValidationError[] {
  return issues.map((issue) => {
    const field = issue.path.map(String).join(".") || "settings";
    return {
      field,
      label: getSettingsFieldLabel(field),
      message: issue.message,
    };
  });
}

export function formatSettingsValidationMessage(errors: SettingsValidationError[]): string {
  if (errors.length === 0) return "Invalid input";
  if (errors.length === 1) {
    const e = errors[0];
    return `${e.label}: ${e.message}`;
  }
  const lines = errors.map((e) => `• ${e.label}: ${e.message}`);
  return `Invalid input:\n${lines.join("\n")}`;
}
