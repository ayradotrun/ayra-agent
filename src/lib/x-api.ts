import { getTwitterClientForUser, isXConnected } from "@/lib/x-oauth";

export async function postTweet(userId: string, text: string) {
  const client = await getTwitterClientForUser(userId);
  if (!client) {
    throw new Error("X account not connected. Link X in Settings.");
  }

  const result = await client.v2.tweet(text.slice(0, 280));
  return {
    posted: true,
    tweetId: result.data.id,
    text: result.data.text,
  };
}

export async function canUserAutoPost(userId: string, agentAutoPostX: boolean): Promise<boolean> {
  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.xAutoPostEnabled || !agentAutoPostX) return false;
  return isXConnected(userId);
}

export async function lookupXUser(userId: string, username: string) {
  const client = await getTwitterClientForUser(userId);
  if (!client) throw new Error("X account not connected");

  const handle = username.replace(/^@/, "");
  const user = await client.v2.userByUsername(handle, {
    "user.fields": ["description", "public_metrics", "created_at", "verified", "url"],
  });

  if (!user.data) {
    return { found: false, username: handle };
  }

  return {
    found: true,
    id: user.data.id,
    username: user.data.username,
    name: user.data.name,
    description: user.data.description,
    url: user.data.url,
    verified: user.data.verified,
    metrics: user.data.public_metrics,
    createdAt: user.data.created_at,
  };
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
