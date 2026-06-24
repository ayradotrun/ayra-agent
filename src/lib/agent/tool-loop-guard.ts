/**
 * Detect repeated identical tool calls (loop guard).
 * Simplified port of agent/tool_guardrails.py for AYRA chat runtime.
 */

export interface ToolLoopGuardConfig {
  warnAfter: number;
  blockAfter: number;
}

const DEFAULT_CONFIG: ToolLoopGuardConfig = {
  warnAfter: 3,
  blockAfter: 6,
};

function callFingerprint(toolName: string, argsJson: string): string {
  return `${toolName}::${argsJson}`;
}

export class ToolLoopGuard {
  private readonly counts = new Map<string, number>();
  private readonly config: ToolLoopGuardConfig;

  constructor(config?: Partial<ToolLoopGuardConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  resetForTurn(): void {
    this.counts.clear();
  }

  beforeCall(toolName: string, argsJson: string): "allow" | "warn" | "block" {
    const key = callFingerprint(toolName, argsJson);
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);

    if (next >= this.config.blockAfter) return "block";
    if (next >= this.config.warnAfter) return "warn";
    return "allow";
  }
}
