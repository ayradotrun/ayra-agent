import { z } from "zod";
import type { SkillDefinition } from "./base";

export const rssReader: SkillDefinition = {
  id: "rss-reader",
  name: "RSS Reader",
  slug: "rss-reader",
  category: "Research",
  description: "Fetch and parse the latest items from an RSS feed.",
  icon: "rss",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    feedUrl: z.string().url().describe("RSS feed URL"),
    limit: z.number().min(1).max(20).optional().describe("Max items to return"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Reading RSS feed: ${input.feedUrl}`, "rss-reader");
    const limit = input.limit ?? 5;

    try {
      const response = await fetch(input.feedUrl, {
        headers: { "User-Agent": "AYRA-Agent/1.0" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status}`);
      }

      const text = await response.text();
      const items = parseRssItems(text, limit);

      await ctx.log("INFO", `Found ${items.length} RSS items`, "rss-reader");
      return { items, count: items.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.log("ERROR", `RSS read failed: ${message}`, "rss-reader");
      return { items: [], count: 0, error: message };
    }
  },
};

function parseRssItems(xml: string, limit: number) {
  const items: Array<{ title: string; link: string; pubDate?: string }> = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");
    if (title) {
      items.push({ title, link: link || "", pubDate: pubDate || undefined });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  return (match[1] || match[2] || "").trim();
}
