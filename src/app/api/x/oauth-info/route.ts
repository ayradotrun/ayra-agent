import { NextResponse } from "next/server";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  getXCallbackUrl,
  getXOAuthConfig,
  X_OAUTH_SCOPES,
} from "@/lib/x-oauth";

/** Debug OAuth config — compare callback URL with developer.x.com (auth required). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const config = getXOAuthConfig();
  const callbackUrl = getXCallbackUrl();
  const baseUrl = process.env.NEXTAUTH_URL?.trim() || "http://localhost:3000";

  return NextResponse.json({
    oauthConfigured: !!config,
    callbackUrl,
    nextAuthUrl: baseUrl.replace(/\/$/, ""),
    scopes: [...X_OAUTH_SCOPES],
    clientIdHint: config?.clientId ? `${config.clientId.slice(0, 8)}…` : null,
    checks: [
      "Register callbackUrl exactly in developer.x.com → User authentication settings → Callback URI",
      "Type of App must be Web App, Automated App or Bot (not Native App)",
      "App permissions: Read and write",
      "Turn OFF Request email unless privacy policy + terms URLs are set",
      "Use OAuth 2.0 Client ID + Secret (not OAuth 1.0 Consumer Keys)",
      baseUrl.includes("localhost")
        ? "Local dev: open AYRA at the same host as callbackUrl (http://localhost:3000)"
        : "Production: callbackUrl must be https://your-domain/api/x/callback on this server",
    ],
  });
}
