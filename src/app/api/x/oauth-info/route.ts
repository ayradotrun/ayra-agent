import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  getXCallbackUrl,
  getXOAuthConfig,
  resolveRequestOrigin,
  X_OAUTH_SCOPES,
} from "@/lib/x-oauth";

/** Debug OAuth config — compare callback URL with developer.x.com (auth required). */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const config = getXOAuthConfig();
  const callbackUrl = getXCallbackUrl(request);
  const requestOrigin = resolveRequestOrigin(request);
  const envCallback = process.env.X_CALLBACK_URL?.trim() || null;
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim() || null;

  return NextResponse.json({
    oauthConfigured: !!config,
    callbackUrl,
    requestOrigin,
    envCallback,
    nextAuthUrl,
    scopes: [...X_OAUTH_SCOPES],
    clientIdHint: config?.clientId ? `${config.clientId.slice(0, 8)}…` : null,
    checks: [
      "Callback URI in developer.x.com must exactly match callbackUrl above",
      "OAuth 2.0 Client ID + Secret from User authentication (not OAuth 1.0 Consumer Keys)",
      "Type: Web App | Permissions: Read and write | Request email: OFF",
      "Fill Organization URL: https://agent.ayra.run (not empty https://)",
      envCallback?.startsWith("http://") && requestOrigin?.startsWith("https://")
        ? "VPS .env uses http:// — update NEXTAUTH_URL and X_CALLBACK_URL to https://"
        : envCallback?.includes("localhost") && requestOrigin?.includes("agent.ayra.run")
          ? "VPS .env still has localhost callback — update .env on server"
          : "Connect from the same domain as callbackUrl",
    ],
  });
}
