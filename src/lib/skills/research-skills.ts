import { z } from "zod";
import type { SkillDefinition } from "./base";
import { fetchText, stripHtml, runLlm } from "./helpers";

export const webSearch: SkillDefinition = {
  id: "web-search",
  name: "Web Search",
  slug: "web-search",
  category: "Research",
  description: "Search the web for information using DuckDuckGo.",
  icon: "search",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    query: z.string().min(1).describe("Search query"),
    maxResults: z.number().min(1).max(10).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Searching: ${input.query}`, "web-search");
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(input.query)}&format=json&no_html=1`;
    const res = await fetch(url, { headers: { "User-Agent": "AYRA-Agent" } });
    const data = (await res.json()) as {
      AbstractText?: string;
      AbstractURL?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const related = (data.RelatedTopics ?? [])
      .filter((t) => t.Text)
      .slice(0, input.maxResults ?? 5)
      .map((t) => ({ title: t.Text, url: t.FirstURL }));

    return {
      query: input.query,
      summary: data.AbstractText || null,
      sourceUrl: data.AbstractURL || null,
      related,
      ok: !!(data.AbstractText || related.length),
    };
  },
};

export const newsMonitor: SkillDefinition = {
  id: "news-monitor",
  name: "News Monitor",
  slug: "news-monitor",
  category: "Research",
  description: "Monitor RSS news feeds for keywords.",
  icon: "newspaper",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    topic: z.string().min(1).describe("Topic or keyword to filter"),
    feedUrl: z.string().url().optional().describe("RSS feed URL"),
    limit: z.number().min(1).max(20).optional(),
  }),
  async execute(input, ctx) {
    const feedUrl =
      input.feedUrl || "https://cointelegraph.com/rss/tag/solana";
    await ctx.log("INFO", `Monitoring news: ${input.topic}`, "news-monitor");

    const xml = await fetchText(feedUrl);
    const items: Array<{ title: string; link: string }> = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) && items.length < (input.limit ?? 10) * 3) {
      const block = match[1];
      const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
      const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim();
      if (title && link) items.push({ title: stripHtml(title), link: stripHtml(link) });
    }

    const keyword = input.topic.toLowerCase();
    const filtered = items
      .filter((i) => i.title.toLowerCase().includes(keyword))
      .slice(0, input.limit ?? 10);

    return { topic: input.topic, feedUrl, matches: filtered, totalScanned: items.length, ok: true };
  },
};

export const websiteScraper: SkillDefinition = {
  id: "website-scraper",
  name: "Website Scraper",
  slug: "website-scraper",
  category: "Research",
  description: "Extract readable text from a web page.",
  icon: "globe",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    url: z.string().url().describe("Page URL"),
    maxChars: z.number().min(500).max(10000).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Scraping: ${input.url}`, "website-scraper");
    const html = await fetchText(input.url);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    const text = stripHtml(html).slice(0, input.maxChars ?? 4000);
    return { url: input.url, title: stripHtml(title), excerpt: text, charCount: text.length, ok: true };
  },
};

export const documentationReader: SkillDefinition = {
  id: "documentation-reader",
  name: "Documentation Reader",
  slug: "documentation-reader",
  category: "Research",
  description: "Read documentation pages and extract structure.",
  icon: "book-open",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    url: z.string().url().describe("Documentation URL"),
    focus: z.string().optional().describe("Topic to focus on"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Reading docs: ${input.url}`, "documentation-reader");
    const html = await fetchText(input.url);
    const headings: string[] = [];
    const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) && headings.length < 30) {
      headings.push(stripHtml(headingMatch[1]));
    }
    const excerpt = stripHtml(html).slice(0, 3000);

    let summary = "";
    try {
      summary = await runLlm(
        ctx.userId,
        "Summarize documentation structure and key points. Be concise and factual.",
        `URL: ${input.url}\nFocus: ${input.focus || "general"}\nHeadings: ${headings.join(" | ")}\n\nContent excerpt:\n${excerpt}`
      );
    } catch {
      summary = headings.length ? `Found ${headings.length} sections.` : "Could not summarize.";
    }

    return { url: input.url, headings, summary, ok: true };
  },
};
