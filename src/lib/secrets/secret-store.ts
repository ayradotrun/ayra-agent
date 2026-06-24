import { prisma } from "@/lib/db";
import { encryptSafe, decryptSafe } from "@/lib/encryption";

export type SecretScope = "llm" | "telegram" | "x" | "solana" | "discord";

export type SecretName =
  | "api_key"
  | "bot_token"
  | "api_secret"
  | "access_token"
  | "access_secret"
  | "rpc_api_key";

export const LEGACY_USER_SECRET_FIELDS: Record<
  string,
  Partial<Record<SecretName, string>>
> = {
  llm: { api_key: "openRouterApiKey" },
  telegram: { bot_token: "telegramBotToken" },
  x: {
    api_key: "xApiKey",
    api_secret: "xApiSecret",
    access_token: "xAccessToken",
    access_secret: "xAccessSecret",
  },
  solana: { rpc_api_key: "solanaRpcApiKey" },
};

export async function upsertEncryptedSecret(
  userId: string,
  provider: SecretScope,
  secretName: SecretName,
  plaintext: string
): Promise<void> {
  const encryptedValue = encryptSafe(plaintext);
  await prisma.encryptedSecret.upsert({
    where: {
      userId_provider_secretName: { userId, provider, secretName },
    },
    create: { userId, provider, secretName, encryptedValue },
    update: { encryptedValue },
  });

  const legacyField = LEGACY_USER_SECRET_FIELDS[provider]?.[secretName];
  if (legacyField) {
    await prisma.user.update({
      where: { id: userId },
      data: { [legacyField]: encryptedValue },
    });
  }
}

export async function deleteEncryptedSecret(
  userId: string,
  provider: SecretScope,
  secretName: SecretName
): Promise<void> {
  try {
    await prisma.encryptedSecret.delete({
      where: {
        userId_provider_secretName: { userId, provider, secretName },
      },
    });
  } catch {
    /* row may not exist */
  }

  const legacyField = LEGACY_USER_SECRET_FIELDS[provider]?.[secretName];
  if (legacyField) {
    await prisma.user.update({
      where: { id: userId },
      data: { [legacyField]: null },
    });
  }
}

export async function getDecryptedSecret(
  userId: string,
  provider: SecretScope,
  secretName: SecretName
): Promise<string | undefined> {
  const row = await prisma.encryptedSecret.findUnique({
    where: {
      userId_provider_secretName: { userId, provider, secretName },
    },
    select: { encryptedValue: true },
  });
  if (row?.encryptedValue) return decryptSafe(row.encryptedValue);

  const legacyField = LEGACY_USER_SECRET_FIELDS[provider]?.[secretName];
  if (!legacyField) return undefined;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { [legacyField]: true },
  });
  const encrypted = user?.[legacyField as keyof typeof user] as string | null | undefined;
  return encrypted ? decryptSafe(encrypted) : undefined;
}

export async function listSecretFlags(userId: string) {
  const rows = await prisma.encryptedSecret.findMany({
    where: { userId },
    select: { provider: true, secretName: true },
  });

  const has = (provider: SecretScope, name: SecretName) =>
    rows.some((r) => r.provider === provider && r.secretName === name);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      openRouterApiKey: true,
      telegramBotToken: true,
      xApiKey: true,
      xApiSecret: true,
      xAccessToken: true,
      xAccessSecret: true,
      solanaRpcApiKey: true,
    },
  });

  return {
    hasLlmApiKey: has("llm", "api_key") || !!user?.openRouterApiKey,
    hasTelegramToken: has("telegram", "bot_token") || !!user?.telegramBotToken,
    hasXApiKey: has("x", "api_key") || !!user?.xApiKey,
    hasXApiSecret: has("x", "api_secret") || !!user?.xApiSecret,
    hasXAccessToken: has("x", "access_token") || !!user?.xAccessToken,
    hasXAccessSecret: has("x", "access_secret") || !!user?.xAccessSecret,
    hasSolanaRpcApiKey: has("solana", "rpc_api_key") || !!user?.solanaRpcApiKey,
  };
}
