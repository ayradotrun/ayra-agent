import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  createXOAuthClient,
  getXCallbackUrl,
  getXOAuthConfig,
  isSecureOAuthCookieContext,
  X_OAUTH_SCOPES,
} from "@/lib/x-oauth";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  if (!getXOAuthConfig()) {
    return NextResponse.json(
      { error: "X OAuth not configured. Add X_CLIENT_ID and X_CLIENT_SECRET to .env" },
      { status: 503 }
    );
  }

  const client = createXOAuthClient();
  const callbackUrl = getXCallbackUrl(request);
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
    scope: [...X_OAUTH_SCOPES],
  });

  const cookieOptions = {
    httpOnly: true,
    secure: isSecureOAuthCookieContext(request),
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };

  cookies().set("x_oauth_verifier", codeVerifier, cookieOptions);
  cookies().set("x_oauth_state", state, cookieOptions);
  cookies().set("x_oauth_user", user.id, cookieOptions);
  cookies().set("x_oauth_callback", callbackUrl, cookieOptions);

  return NextResponse.redirect(url);
}
