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

/** Origin from incoming request (nginx x-forwarded-* or Host header). */
export function resolveRequestOrigin(request?: Request): string | null {
  if (!request) return null;

  try {
    const url = new URL(request.url);
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host") || url.host;
    if (!host) return null;

    const proto =
      forwardedProto ||
      (url.protocol === "https:" ? "https" : url.protocol === "http:" ? "http" : "https");
    return `${proto}://${host}`;
  } catch {
    return null;
  }
}

function isLocalhostHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url}`);
    return isLocalhostHost(parsed.hostname);
  } catch {
    return false;
  }
}

function envAppOrigin(): string | null {
  for (const raw of [process.env.NEXTAUTH_URL, process.env.X_CALLBACK_URL]) {
    const value = raw?.trim();
    if (!value) continue;
    try {
      return new URL(value.includes("://") ? value : `https://${value}`).origin;
    } catch {
      continue;
    }
  }
  return null;
}

/** Upgrade http→https for public hosts in production (common VPS .env mistake behind nginx). */
function upgradeProductionOrigin(origin: string): string {
  if (process.env.NODE_ENV !== "production") return origin;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "http:" && !isLocalhostHost(parsed.hostname)) {
      parsed.protocol = "https:";
      return parsed.origin;
    }
  } catch {
    /* ignore */
  }
  return origin;
}

/** Align env callback with the browser/proxy origin (localhost or http→https mismatch). */
function alignCallbackWithRequest(explicit: string, requestOrigin: string | null): string {
  const normalized = explicit.replace(/\/$/, "");
  if (!requestOrigin) return normalized;

  try {
    const envUrl = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
    const reqUrl = new URL(requestOrigin);

    if (isLocalhostUrl(normalized) && !isLocalhostHost(reqUrl.hostname)) {
      return `${requestOrigin}/api/x/callback`;
    }

    if (
      envUrl.hostname === reqUrl.hostname &&
      reqUrl.protocol === "https:" &&
      envUrl.protocol === "http:"
    ) {
      return `${requestOrigin}/api/x/callback`;
    }
  } catch {
    /* use explicit */
  }

  return normalized;
}

/** Public site origin for redirects — request-aware with production https fallback. */
export function resolveAppOrigin(request?: Request): string {
  const requestOrigin = resolveRequestOrigin(request);
  if (requestOrigin) return upgradeProductionOrigin(requestOrigin);

  const envOrigin = envAppOrigin();
  if (envOrigin) return upgradeProductionOrigin(envOrigin);

  return "http://localhost:3000";
}

/** OAuth redirect URI — prefers request origin on production to avoid stale localhost .env on VPS. */
export function getXCallbackUrl(request?: Request): string {
  const requestOrigin = resolveRequestOrigin(request);
  const explicit = process.env.X_CALLBACK_URL?.trim()?.replace(/\/$/, "");

  if (explicit) {
    return alignCallbackWithRequest(explicit, requestOrigin);
  }

  if (requestOrigin) {
    return `${upgradeProductionOrigin(requestOrigin)}/api/x/callback`;
  }

  return `${resolveAppOrigin()}/api/x/callback`;
}

export function isSecureOAuthCookieContext(request?: Request): boolean {
  if (process.env.NODE_ENV === "production") return true;
  const origin = resolveRequestOrigin(request) || envAppOrigin();
  return origin?.startsWith("https://") ?? false;
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
      return null;
    }

    if (needsRefresh) {
      return null;
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
    select: {
      xAuthMethod: true,
      xAccessToken: true,
      xApiKey: true,
      xApiSecret: true,
      xAccessSecret: true,
    },
  });
  if (!user?.xAccessToken) return false;
  if (user.xAuthMethod === "oauth2") return true;
  return !!(user.xApiKey && user.xApiSecret && user.xAccessToken && user.xAccessSecret);
}

export async function verifyXCredentialsForUser(userId: string): Promise<{
  ok: boolean;
  username?: string;
  xUserId?: string;
  error?: string;
}> {
  const client = await getTwitterClientForUser(userId);
  if (!client) {
    return {
      ok: false,
      error:
        "Incomplete X credentials. OAuth: use Connect with X. Manual: save all 4 keys (API Key, API Secret, Access Token, Access Secret) with Read + Write permissions.",
    };
  }

  try {
    const me = await client.v2.me({ "user.fields": ["username", "name"] });
    if (!me.data?.username) {
      return { ok: false, error: "X API connected but profile username was not returned." };
    }
    return { ok: true, username: me.data.username, xUserId: me.data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "X API verification failed";
    return {
      ok: false,
      error: `X credentials rejected by API: ${message.slice(0, 200)}`,
    };
  }
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
    verified: connected && !!user.xUsername,
    authMethod: user.xAuthMethod,
    username: user.xUsername,
    userId: user.xUserId,
    connectedAt: user.xConnectedAt,
    autoPostEnabled: user.xAutoPostEnabled,
  };
}
