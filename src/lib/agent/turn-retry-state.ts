/**
 * Per-turn retry counters for LLM API calls.
 * Ported from agent/turn_retry_state.py
 */

export class TurnRetryState {
  apiAttempts = 0;
  modelFallbacks = 0;
  lastErrorReason: string | null = null;

  recordApiFailure(reason: string): void {
    this.apiAttempts += 1;
    this.lastErrorReason = reason;
  }

  recordModelFallback(): void {
    this.modelFallbacks += 1;
  }

  reset(): void {
    this.apiAttempts = 0;
    this.modelFallbacks = 0;
    this.lastErrorReason = null;
  }
}
