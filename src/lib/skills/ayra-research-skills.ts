/**
 * Research skills ported/adapted from hermes-agent skills/research.
 */

import { z } from "zod";
import type { SkillDefinition } from "./base";
import { fetchText, stripHtml } from "./helpers";
import { performWebSearch } from "@/lib/search/web-search";

export const arxivSearch: SkillDefinition = {
  id: "arxiv-search",
  name: "arXiv Search",
  slug: "arxiv-search",
  category: "Research",
  description: "Search arXiv for research papers by query (title, abstract, author).",
  icon: "book-open",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    query: z.string().min(1).describe("Search query"),
    maxResults: z.number().min(1).max(20).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `arXiv search: ${input.query}`, "arxiv-search");
    const max = input.maxResults ?? 5;
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(input.query)}&start=0&max_results=${max}&sortBy=relevance`;

    const xml = await fetchText(url);
    const entries: Array<{ id: string; title: string; summary: string; published: string; link: string }> = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
    let match;
    while ((match = entryRegex.exec(xml)) && entries.length < max) {
      const block = match[1];
      const id = block.match(/<id>([\s\S]*?)<\/id>/i)?.[1]?.trim() ?? "";
      const title = stripHtml(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
      const summary = stripHtml(block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? "").slice(0, 400);
      const published = block.match(/<published>([\s\S]*?)<\/published>/i)?.[1]?.trim() ?? "";
      entries.push({
        id,
        title,
        summary,
        published,
        link: id.replace("http://arxiv.org/abs/", "https://arxiv.org/abs/"),
      });
    }

    return { query: input.query, papers: entries, count: entries.length, ok: true };
  },
};

export const newsDigest: SkillDefinition = {
  id: "news-digest",
  name: "News Digest",
  slug: "news-digest",
  category: "Research",
  description: "Build a topic digest from web search — useful for scheduled blueprints.",
  icon: "newspaper",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    topic: z.string().min(1).describe("Topic to digest"),
    maxItems: z.number().min(1).max(10).optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `News digest: ${input.topic}`, "news-digest");
    const result = await performWebSearch(`${input.topic} news latest`, input.maxItems ?? 5, ctx.userId);
    if (!result.ok || !result.related?.length) {
      return { topic: input.topic, items: [], ok: false, error: result.error ?? "No results" };
    }

    const items = result.related.slice(0, input.maxItems ?? 5).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet?.slice(0, 200),
    }));

    return { topic: input.topic, items, provider: result.provider, ok: true };
  },
};

export const AYRA_RESEARCH_SKILLS = [arxivSearch, newsDigest];
