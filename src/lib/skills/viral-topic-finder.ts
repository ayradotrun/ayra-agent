import { z } from "zod";
import type { SkillDefinition } from "./base";
import { runLlm } from "./helpers";
import { rssReader } from "./rss-reader";

const inputSchema = z.object({
  niche: z.string().optional().describe("Niche e.g. solana, memecoin dev, web3 launch"),
  count: z.number().min(1).max(10).optional().describe("Number of topic ideas"),
});

export const viralTopicFinder: SkillDefinition = {
  id: "viral-topic-finder",
  name: "Viral Topic Finder",
  slug: "viral-topic-finder",
  category: "Social",
  description: "Find trending post topics from RSS feeds and AI analysis.",
  icon: "trending-up",
  permission: "read",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    const niche = input.niche || "solana developer token builder";
    const count = input.count ?? 5;
    await ctx.log("INFO", `Finding topics for: ${niche}`, "viral-topic-finder");

    let headlines: string[] = [];
    try {
      const feed = await rssReader.execute(
        { feedUrl: "https://cointelegraph.com/rss/tag/solana", limit: 8 },
        ctx
      );
      if (feed && typeof feed === "object" && "items" in feed) {
        headlines = ((feed as { items: Array<{ title: string }> }).items ?? []).map((i) => i.title);
      }
    } catch {
      headlines = [];
    }

    const raw = await runLlm(
      ctx.userId,
      "Generate viral X post topic ideas for developers. Return JSON array of strings only. Not financial advice.",
      `Niche: ${niche}\nCount: ${count}\nRecent headlines:\n${headlines.join("\n") || "none"}`
    );

    let topics: string[] = [];
    try {
      topics = JSON.parse(raw.replace(/```json?\s*|\s*```/g, ""));
    } catch {
      topics = raw.split("\n").filter(Boolean).slice(0, count);
    }

    return {
      niche,
      topics: topics.slice(0, count),
      hooks: topics.slice(0, count).map((t) => `${t} 🧵`),
      sourceHeadlines: headlines.slice(0, 5),
      note: "Ideas only — verify facts before posting.",
      ok: topics.length > 0,
    };
  },
};
