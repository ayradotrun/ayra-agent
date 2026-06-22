import { z } from "zod";
import type { SkillDefinition } from "./base";
import { readXTimeline } from "@/lib/x-api";

const inputSchema = z.object({
  username: z.string().min(1).describe("X username with or without @"),
  maxResults: z.number().min(1).max(10).optional().describe("Number of recent tweets"),
});

export const xTimelineReader: SkillDefinition = {
  id: "x-timeline-reader",
  name: "X Timeline Reader",
  slug: "x-timeline-reader",
  category: "Social",
  description: "Read recent tweets from an X user (requires X login in Settings).",
  icon: "rss",
  permission: "network",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    const username = input.username.replace(/^@/, "");
    await ctx.log("INFO", `Reading timeline: @${username}`, "x-timeline-reader");

    try {
      const result = await readXTimeline(ctx.userId, username, input.maxResults ?? 5);
      await ctx.log("INFO", `Fetched ${result.tweets?.length ?? 0} tweets`, "x-timeline-reader");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Timeline read failed";
      await ctx.log("ERROR", message, "x-timeline-reader");
      return { found: false, username, tweets: [], error: message };
    }
  },
};
