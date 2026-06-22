import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import {
  createXOAuthClient,
  getXCallbackUrl,
  getXOAuthConfig,
  X_OAUTH_SCOPES,
} from "@/lib/x-oauth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  if (!getXOAuthConfig()) {
    return NextResponse.json(
      { error: "X OAuth not configured. Add X_CLIENT_ID and X_CLIENT_SECRET to .env" },
      { status: 503 }
    );
  }

  const client = createXOAuthClient();
  const callbackUrl = getXCallbackUrl();
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
    scope: [...X_OAUTH_SCOPES],
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };

  cookies().set("x_oauth_verifier", codeVerifier, cookieOptions);
  cookies().set("x_oauth_state", state, cookieOptions);
  cookies().set("x_oauth_user", user.id, cookieOptions);

  return NextResponse.redirect(url);
}
