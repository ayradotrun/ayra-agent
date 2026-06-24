/**
 * Jittered exponential backoff for decorrelated retries.
 * Ported from hermes-agent agent/retry_utils.py
 */

let jitterCounter = 0;

export function jitteredBackoff(
  attempt: number,
  options?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterRatio?: number;
  }
): number {
  const baseDelayMs = options?.baseDelayMs ?? 5000;
  const maxDelayMs = options?.maxDelayMs ?? 120_000;
  const jitterRatio = options?.jitterRatio ?? 0.5;

  jitterCounter += 1;
  const exponent = Math.max(0, attempt - 1);
  const delay =
    exponent >= 63 || baseDelayMs <= 0
      ? maxDelayMs
      : Math.min(baseDelayMs * 2 ** exponent, maxDelayMs);

  const seed = (Date.now() ^ (jitterCounter * 0x9e3779b9)) >>> 0;
  const jitter = ((seed % 10_000) / 10_000) * jitterRatio * delay;

  return delay + jitter;
}

export async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number; label?: string }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;
      const wait = jitteredBackoff(attempt, { baseDelayMs: options?.baseDelayMs });
      await sleepMs(wait);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
