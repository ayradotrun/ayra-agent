import type { IncomingMessage } from "http";

export function internalApiKey(): string | null {
  const key = process.env.AYRA_INTERNAL_API_SECRET?.trim();
  return key || null;
}

export function verifyInternalRequest(req: IncomingMessage): boolean {
  const expected = internalApiKey();
  const header = req.headers["x-ayra-internal-key"];
  const provided = typeof header === "string" ? header : "";

  if (expected) {
    return provided === expected;
  }

  // Dev-only: allow localhost calls when no secret is configured.
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const host = req.headers.host ?? "";
  return host.startsWith("127.0.0.1") || host.startsWith("localhost");
}

export function internalApiHeaders(): Record<string, string> {
  const key = internalApiKey();
  if (!key) return {};
  return { "X-AYRA-Internal-Key": key };
}
