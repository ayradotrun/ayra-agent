import { TwitterApi } from "twitter-api-v2";
import { prisma } from "@/lib/prisma";
import { decryptSafe, encryptSafe } from "@/lib/encryption";

export const X_OAUTH_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
] as const;

export function getXOAuthConfig() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getXCallbackUrl(): string {
  const explicit = process.env.X_CALLBACK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/x/callback`;
}

export function isXOAuthConfigured(): boolean {
  return getXOAuthConfig() !== null;
}

export function createXOAuthClient() {
  const config = getXOAuthConfig();
  if (!config) throw new Error("X OAuth is not configured (X_CLIENT_ID / X_CLIENT_SECRET)");
  return new TwitterApi({ clientId: config.clientId, clientSecret: config.clientSecret });
}

export async function refreshUserXToken(userId: string): Promise<TwitterApi | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.xRefreshToken || !user.xAccessToken) return null;

  const config = getXOAuthConfig();
  if (!config) return null;

  try {
    const client = new TwitterApi({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
    const refreshed = await client.refreshOAuth2Token(decryptSafe(user.xRefreshToken));

    await prisma.user.update({
      where: { id: userId },
      data: {
        xAccessToken: encryptSafe(refreshed.accessToken),
        xRefreshToken: refreshed.refreshToken
          ? encryptSafe(refreshed.refreshToken)
          : user.xRefreshToken,
        xTokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
      },
    });

    return refreshed.client;
  } catch {
    return null;
  }
}

export async function getTwitterClientForUser(userId: string): Promise<TwitterApi | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  if (user.xAuthMethod === "oauth2" && user.xAccessToken) {
    const needsRefresh =
      user.xTokenExpiresAt && user.xTokenExpiresAt.getTime() < Date.now() + 60_000;

    if (needsRefresh && user.xRefreshToken) {
      const refreshed = await refreshUserXToken(userId);
      if (refreshed) return refreshed;
    }

    return new TwitterApi(decryptSafe(user.xAccessToken));
  }

  if (
    user.xApiKey &&
    user.xApiSecret &&
    user.xAccessToken &&
    user.xAccessSecret
  ) {
    return new TwitterApi({
      appKey: decryptSafe(user.xApiKey),
      appSecret: decryptSafe(user.xApiSecret),
      accessToken: decryptSafe(user.xAccessToken),
      accessSecret: decryptSafe(user.xAccessSecret),
    });
  }

  return null;
}

export async function isXConnected(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xAuthMethod: true, xAccessToken: true, xApiKey: true, xAccessSecret: true },
  });
  if (!user?.xAccessToken) return false;
  if (user.xAuthMethod === "oauth2") return true;
  return !!(user.xApiKey && user.xAccessSecret);
}

export async function getXConnectionInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xAuthMethod: true,
      xUsername: true,
      xUserId: true,
      xConnectedAt: true,
      xAutoPostEnabled: true,
      xAccessToken: true,
      xApiKey: true,
      xAccessSecret: true,
    },
  });
  if (!user) return { connected: false };
  const connected = await isXConnected(userId);
  return {
    connected,
    authMethod: user.xAuthMethod,
    username: user.xUsername,
    userId: user.xUserId,
    connectedAt: user.xConnectedAt,
    autoPostEnabled: user.xAutoPostEnabled,
  };
}
