type XApiErrorShape = {
  code?: number;
  data?: {
    detail?: string;
    title?: string;
    type?: string;
    errors?: Array<{ message?: string; code?: number }>;
  };
  errors?: Array<{ message?: string; code?: number }>;
};

export function parseXApiError(error: unknown): {
  httpCode?: number;
  detail: string;
  type?: string;
} {
  if (!error || typeof error !== "object") {
    return { detail: String(error ?? "Unknown X API error") };
  }

  const e = error as XApiErrorShape;
  const nested = e.data?.errors?.[0]?.message;
  const flat = e.errors?.[0]?.message;
  const detail =
    e.data?.detail ||
    nested ||
    flat ||
    e.data?.title ||
    (error instanceof Error ? error.message : "X API request failed");

  return {
    httpCode: e.code,
    detail,
    type: e.data?.type,
  };
}

export function isXApiBillingError(error: unknown): boolean {
  const { httpCode, detail, type } = parseXApiError(error);
  const text = `${detail} ${type ?? ""}`.toLowerCase();
  return (
    httpCode === 402 ||
    /402|payment required|usage-capped|usage capped|billing|credit|insufficient/i.test(text)
  );
}

export function isXApiBillingMessage(message: string): boolean {
  const text = message.toLowerCase();
  return (
    /402|payment required|usage-capped|usage capped|pay-per-use credits|insufficient.*credit/i.test(
      text
    )
  );
}

export function formatXBillingError(mode: "lookup" | "write" = "lookup"): string {
  if (mode === "lookup") {
    return (
      "Insufficient X API pay-per-use credits (error 402). " +
      "Add credits at developer.x.com → your Project → Billing. " +
      "Profile lookup and timelines consume credits on the pay-per-use plan."
    );
  }

  return (
    "X API write is blocked — insufficient pay-per-use credits (error 402). " +
    "Open developer.x.com → your Project → Billing and top up credits."
  );
}

export function formatXLookupError(
  error: unknown,
  authMethod: string | null | undefined
): string {
  const { httpCode, detail, type } = parseXApiError(error);
  const text = `${detail} ${type ?? ""}`.toLowerCase();

  if (isXApiBillingError(error)) {
    return formatXBillingError("lookup");
  }

  if (
    httpCode === 403 ||
    /403|forbidden|client-forbidden|not authorized|read.only|read only|453/i.test(text)
  ) {
    if (authMethod === "oauth1") {
      return (
        "X rejected the lookup (403). Confirm app permissions are Read and write, regenerate Access Token + Secret, " +
        "and check pay-per-use credits at developer.x.com → Billing."
      );
    }

    return (
      "X rejected the lookup (403). Disconnect and reconnect X in Settings, or check developer.x.com billing/credits."
    );
  }

  if (httpCode === 401 || /401|unauthorized|invalid.*token|expired/i.test(text)) {
    if (authMethod === "oauth2") {
      return (
        "X token expired or invalid. Disconnect and reconnect via Connect with X in Settings."
      );
    }
    return "X token invalid (401). Regenerate keys in developer.x.com and save again in Settings.";
  }

  return detail.slice(0, 350);
}

export function formatXPostError(
  error: unknown,
  authMethod: string | null | undefined
): string {
  const { httpCode, detail, type } = parseXApiError(error);
  const text = `${detail} ${type ?? ""}`.toLowerCase();

  if (isXApiBillingError(error)) {
    return formatXBillingError("write");
  }

  if (
    httpCode === 403 ||
    /403|forbidden|client-forbidden|not authorized|read.only|read only|453/i.test(text)
  ) {
    if (authMethod === "oauth1") {
      return (
        "X rejected the tweet (403). Keys verify for *read* but not *write*. " +
        "Fix: developer.x.com → your App → Settings → App permissions = **Read and write** → Save → " +
        "Keys and tokens → **Regenerate** Access Token + Secret (old tokens stay read-only) → " +
        "paste all 4 keys again in Dashboard → Settings → Save."
      );
    }

    if (authMethod === "oauth2") {
      return (
        "X rejected the tweet (403). Disconnect X in Settings, then **Connect with X** again " +
        "(needs tweet.write scope). Also confirm developer.x.com billing/credits if your app uses pay-per-use."
      );
    }

    return (
      "X rejected the tweet (403). Confirm app permissions are Read and write, regenerate tokens, " +
      "and check developer.x.com billing/credits for write access."
    );
  }

  if (httpCode === 401 || /401|unauthorized|invalid.*token|expired/i.test(text)) {
    if (authMethod === "oauth2") {
      return (
        "X token expired or invalid. Disconnect and reconnect via **Connect with X** in Settings. " +
        "Server needs X_CLIENT_ID and X_CLIENT_SECRET in .env to refresh tokens."
      );
    }
    return (
      "X token invalid (401). Regenerate all 4 keys in developer.x.com and save again in Settings."
    );
  }

  return detail.slice(0, 350);
}
