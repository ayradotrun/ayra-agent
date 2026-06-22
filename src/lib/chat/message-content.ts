import type { OpenRouterMessageContent } from "@/lib/openrouter";

export interface ChatMessageMetadata {
  imageUrls?: string[];
  reasoning?: string;
}

export function buildUserMessageContent(
  text: string,
  imageUrls?: string[]
): OpenRouterMessageContent {
  const trimmed = text.trim();
  const urls = imageUrls?.filter(Boolean) ?? [];

  if (urls.length === 0) {
    return trimmed || "(image attached)";
  }

  const parts: OpenRouterMessageContent = [];
  if (trimmed) {
    parts.push({ type: "text", text: trimmed });
  }
  for (const url of urls) {
    parts.push({ type: "image_url", image_url: { url: absoluteImageUrl(url) } });
  }
  return parts;
}

function absoluteImageUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export function historyContentForModel(
  role: "user" | "assistant",
  content: string,
  imageUrls?: string[]
): OpenRouterMessageContent {
  if (role === "user" && imageUrls?.length) {
    return buildUserMessageContent(content, imageUrls);
  }
  return content;
}
