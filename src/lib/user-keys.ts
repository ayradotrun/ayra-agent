import { decryptSafe } from "@/lib/encryption";

export function getDecryptedUserKey(encryptedKey?: string | null): string | undefined {
  if (!encryptedKey) return undefined;
  return decryptSafe(encryptedKey);
}
