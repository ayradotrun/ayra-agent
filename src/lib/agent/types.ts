export interface ToolCallResult {
  toolCallId: string;
  name: string;
  result: unknown;
}

export interface RunResult {
  runId: string;
  status: "COMPLETED" | "FAILED" | "TIMEOUT";
  output: string;
  summary: string;
  tokenUsage: number;
  toolCalls: number;
  durationMs: number;
  error?: string;
  imagePaths?: string[];
}

export interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  systemPrompt: string;
  model: string;
  memoryEnabled: boolean;
  telegramNotify: boolean;
  skillSlugs: string[];
}
