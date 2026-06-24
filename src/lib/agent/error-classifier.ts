/**
 * API error classification for smart retry / failover.
 * Trimmed port of hermes-agent agent/error_classifier.py
 */

export enum FailoverReason {
  auth = "auth",
  authPermanent = "auth_permanent",
  billing = "billing",
  rateLimit = "rate_limit",
  overloaded = "overloaded",
  serverError = "server_error",
  timeout = "timeout",
  contextOverflow = "context_overflow",
  payloadTooLarge = "payload_too_large",
  modelNotFound = "model_not_found",
  contentPolicyBlocked = "content_policy_blocked",
  formatError = "format_error",
  unknown = "unknown",
}

export interface ClassifiedError {
  reason: FailoverReason;
  statusCode?: number;
  message: string;
  shouldRetry: boolean;
  shouldFallbackModel: boolean;
  backoffMs?: number;
}

function lower(text: string): string {
  return text.toLowerCase();
}

export function classifyApiError(status: number, body: string): ClassifiedError {
  const msg = body.slice(0, 500);
  const l = lower(msg);

  if (status === 401 || status === 403) {
    const permanent = l.includes("invalid") && l.includes("key");
    return {
      reason: permanent ? FailoverReason.authPermanent : FailoverReason.auth,
      statusCode: status,
      message: msg,
      shouldRetry: !permanent,
      shouldFallbackModel: false,
    };
  }

  if (status === 402) {
    return {
      reason: FailoverReason.billing,
      statusCode: status,
      message: msg,
      shouldRetry: false,
      shouldFallbackModel: true,
    };
  }

  if (status === 429) {
    return {
      reason: FailoverReason.rateLimit,
      statusCode: status,
      message: msg,
      shouldRetry: false,
      shouldFallbackModel: true,
      backoffMs: 2_000,
    };
  }

  if (status === 404 || l.includes("model") && l.includes("not found")) {
    return {
      reason: FailoverReason.modelNotFound,
      statusCode: status,
      message: msg,
      shouldRetry: false,
      shouldFallbackModel: true,
    };
  }

  if (status === 413 || l.includes("context length") || l.includes("too many tokens")) {
    return {
      reason: FailoverReason.contextOverflow,
      statusCode: status,
      message: msg,
      shouldRetry: true,
      shouldFallbackModel: false,
    };
  }

  if (status === 400 && (l.includes("content policy") || l.includes("safety"))) {
    return {
      reason: FailoverReason.contentPolicyBlocked,
      statusCode: status,
      message: msg,
      shouldRetry: false,
      shouldFallbackModel: false,
    };
  }

  if (status >= 500 || status === 529) {
    return {
      reason: status === 529 ? FailoverReason.overloaded : FailoverReason.serverError,
      statusCode: status,
      message: msg,
      shouldRetry: true,
      shouldFallbackModel: false,
      backoffMs: 3_000,
    };
  }

  if (l.includes("timeout") || l.includes("timed out") || l.includes("econnreset")) {
    return {
      reason: FailoverReason.timeout,
      message: msg,
      shouldRetry: true,
      shouldFallbackModel: false,
      backoffMs: 2_000,
    };
  }

  return {
    reason: FailoverReason.unknown,
    statusCode: status,
    message: msg,
    shouldRetry: status >= 500,
    shouldFallbackModel: false,
  };
}
