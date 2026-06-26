import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { encryptSafe } from "@/lib/encryption";
import { createXOAuthClient, getXCallbackUrl, resolveAppOrigin } from "@/lib/x-oauth";

function redirectSettings(request: NextRequest, params: Record<string, string>) {
  const base = resolveAppOrigin(request);
  const qs = new URLSearchParams(params).toString();
  return NextResponse.redirect(`${base.replace(/\/$/, "")}/dashboard/settings?${qs}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = cookies();
  const clearCookies = () => {
    cookieStore.delete("x_oauth_verifier");
    cookieStore.delete("x_oauth_state");
    cookieStore.delete("x_oauth_user");
    cookieStore.delete("x_oauth_callback");
  };

  if (error) {
    clearCookies();
    return redirectSettings(request, { x_error: error });
  }

  const savedState = cookieStore.get("x_oauth_state")?.value;
  const codeVerifier = cookieStore.get("x_oauth_verifier")?.value;
  const userId = cookieStore.get("x_oauth_user")?.value;

  if (!code || !state || !codeVerifier || !userId || state !== savedState) {
    clearCookies();
    return redirectSettings(request, { x_error: "invalid_oauth_state" });
  }

  try {
    const client = createXOAuthClient();
    const savedCallback = cookieStore.get("x_oauth_callback")?.value;
    const callbackUrl = savedCallback || getXCallbackUrl(request);

    const { client: userClient, accessToken, refreshToken, expiresIn } =
      await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: callbackUrl,
      });

    const me = await userClient.v2.me({
      "user.fields": ["username", "name", "profile_image_url"],
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        xAuthMethod: "oauth2",
        xAccessToken: encryptSafe(accessToken),
        xRefreshToken: refreshToken ? encryptSafe(refreshToken) : null,
        xAccessSecret: null,
        xApiKey: null,
        xApiSecret: null,
        xTokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        xUsername: me.data.username,
        xUserId: me.data.id,
        xConnectedAt: new Date(),
      },
    });

    clearCookies();
    return redirectSettings(request, { x: "connected", handle: me.data.username ?? "" });
  } catch (err) {
    clearCookies();
    const message = err instanceof Error ? err.message : "oauth_failed";
    return redirectSettings(request, { x_error: message.slice(0, 120) });
  }
}
