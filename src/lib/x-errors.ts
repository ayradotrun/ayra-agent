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

export function formatXPostError(
  error: unknown,
  authMethod: string | null | undefined
): string {
  const { httpCode, detail, type } = parseXApiError(error);
  const text = `${detail} ${type ?? ""}`.toLowerCase();

  if (
    httpCode === 402 ||
    /402|payment required|usage-capped|usage capped|billing|credit/i.test(text)
  ) {
    return (
      "X API write is blocked (billing). Open developer.x.com → your Project → Billing / pay-per-use credits. " +
      "Posting requires an active write package — the free read-only tier cannot create tweets."
    );
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
