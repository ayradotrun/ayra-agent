import { getDecryptedSecret } from "@/lib/secrets/secret-store";

/** Only the user's Dashboard Jina key — never the server .env (BYOK). */
export async function resolveJinaApiKey(userId?: string): Promise<string | undefined> {
  if (!userId) return undefined;

  const userKey = await getDecryptedSecret(userId, "jina", "api_key");
  return userKey?.trim() || undefined;
}
