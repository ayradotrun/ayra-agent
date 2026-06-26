import {
  getTwitterClientForUser,
  isXConnected,
  isXOAuthConfigured,
} from "@/lib/x-oauth";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/with-timeout";
import { formatXLookupError, formatXPostError } from "@/lib/x-errors";

export type AutoPostBlockReason =
  | "account_auto_post_disabled"
  | "agent_auto_post_disabled"
  | "x_not_connected"
  | "x_oauth_not_configured"
  | "x_token_invalid"
  | "ready";

const BLOCK_MESSAGES: Record<Exclude<AutoPostBlockReason, "ready">, string> = {
  account_auto_post_disabled:
    "Account auto-post is off. Enable 'Allow auto-post to X' in Dashboard → Settings.",
  agent_auto_post_disabled:
    "Agent auto-post is off. Enable 'Auto-post to X' on the agent settings page.",
  x_not_connected:
    "X account not connected. Open Dashboard → Settings → Connect with X (or add manual API keys).",
  x_oauth_not_configured:
    "X OAuth is not configured on the server. Set X_CLIENT_ID and X_CLIENT_SECRET in .env, then restart npm run dev and npm run worker.",
  x_token_invalid:
    "X token expired or invalid. Disconnect and reconnect X in Settings (server needs valid X OAuth env vars to refresh tokens).",
};

export async function resolveAutoPostReadiness(
  userId: string,
  agentAutoPostX: boolean
): Promise<{ ready: boolean; reason: AutoPostBlockReason; message: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      xAutoPostEnabled: true,
      xAuthMethod: true,
      xAccessToken: true,
      xApiKey: true,
      xAccessSecret: true,
    },
  });

  if (!user?.xAutoPostEnabled) {
    return {
      ready: false,
      reason: "account_auto_post_disabled",
      message: BLOCK_MESSAGES.account_auto_post_disabled,
    };
  }

  if (!agentAutoPostX) {
    return {
      ready: false,
      reason: "agent_auto_post_disabled",
      message: BLOCK_MESSAGES.agent_auto_post_disabled,
    };
  }

  const connected = await isXConnected(userId);
  if (!connected) {
    if (user.xAuthMethod === "oauth2" && !isXOAuthConfigured()) {
      return {
        ready: false,
        reason: "x_oauth_not_configured",
        message: BLOCK_MESSAGES.x_oauth_not_configured,
      };
    }
    return {
      ready: false,
      reason: "x_not_connected",
      message: BLOCK_MESSAGES.x_not_connected,
    };
  }

  const client = await getTwitterClientForUser(userId);
  if (!client) {
    if (user.xAuthMethod === "oauth2" && !isXOAuthConfigured()) {
      return {
        ready: false,
        reason: "x_oauth_not_configured",
        message: BLOCK_MESSAGES.x_oauth_not_configured,
      };
    }
    return {
      ready: false,
      reason: "x_token_invalid",
      message: BLOCK_MESSAGES.x_token_invalid,
    };
  }

  return { ready: true, reason: "ready", message: "OK" };
}

export async function postTweet(userId: string, text: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xAuthMethod: true },
  });

  const client = await getTwitterClientForUser(userId);
  if (!client) {
    const status = await resolveAutoPostReadiness(userId, true);
    if (!status.ready && status.reason !== "agent_auto_post_disabled") {
      throw new Error(status.message);
    }
    throw new Error(BLOCK_MESSAGES.x_not_connected);
  }

  try {
    const result = await withTimeout(
      client.v2.tweet(text.slice(0, 280)),
      20_000,
      "X post"
    );
    return {
      posted: true,
      tweetId: result.data.id,
      text: result.data.text ?? text.slice(0, 280),
    };
  } catch (error) {
    throw new Error(formatXPostError(error, user?.xAuthMethod));
  }
}

export async function canUserAutoPost(userId: string, agentAutoPostX: boolean): Promise<boolean> {
  const status = await resolveAutoPostReadiness(userId, agentAutoPostX);
  return status.ready;
}

export async function lookupXUser(userId: string, username: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xAuthMethod: true },
  });

  const client = await getTwitterClientForUser(userId);
  if (!client) throw new Error("X account not connected");

  const handle = username.replace(/^@/, "");

  try {
    const result = await client.v2.userByUsername(handle, {
      "user.fields": ["description", "public_metrics", "created_at", "verified", "url"],
    });

    if (!result.data) {
      return { found: false, username: handle };
    }

    return {
      found: true,
      id: result.data.id,
      username: result.data.username,
      name: result.data.name,
      description: result.data.description,
      url: result.data.url,
      verified: result.data.verified,
      metrics: result.data.public_metrics,
      createdAt: result.data.created_at,
    };
  } catch (error) {
    throw new Error(formatXLookupError(error, user?.xAuthMethod));
  }
}

export async function readXTimeline(
  userId: string,
  username: string,
  maxResults = 5
) {
  const client = await getTwitterClientForUser(userId);
  if (!client) throw new Error("X account not connected");

  const handle = username.replace(/^@/, "");
  const profile = await client.v2.userByUsername(handle);
  if (!profile.data) {
    return { found: false, username: handle, tweets: [] };
  }

  const timeline = await client.v2.userTimeline(profile.data.id, {
    max_results: Math.min(Math.max(maxResults, 5), 10),
    "tweet.fields": ["created_at", "public_metrics", "text"],
    exclude: ["retweets", "replies"],
  });

  const tweets = (timeline.data?.data ?? []).map((t) => ({
    id: t.id,
    text: t.text,
    createdAt: t.created_at,
    metrics: t.public_metrics,
  }));

  return {
    found: true,
    username: handle,
    userId: profile.data.id,
    tweets,
  };
}

export async function getMyXProfile(userId: string) {
  const client = await getTwitterClientForUser(userId);
  if (!client) throw new Error("X account not connected");

  const me = await client.v2.me({
    "user.fields": ["description", "public_metrics", "created_at", "verified", "url"],
  });

  return {
    id: me.data.id,
    username: me.data.username,
    name: me.data.name,
    description: me.data.description,
    url: me.data.url,
    verified: me.data.verified,
    metrics: me.data.public_metrics,
  };
}