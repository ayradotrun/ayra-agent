import { z } from "zod";
import type { SkillDefinition } from "./base";
import { runLlm } from "./helpers";
import { getTwitterClientForUser } from "@/lib/x-oauth";

export const replyGenerator: SkillDefinition = {
  id: "reply-generator",
  name: "Reply Generator",
  slug: "reply-generator",
  category: "Social",
  description: "Generate reply drafts for social posts.",
  icon: "message-circle",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    originalPost: z.string().min(1).describe("The post to reply to"),
    tone: z.enum(["helpful", "professional", "witty", "supportive"]).optional(),
    context: z.string().optional(),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Generating reply draft", "reply-generator");
    const draft = await runLlm(
      ctx.userId,
      `Generate a concise X reply. Tone: ${input.tone || "helpful"}. Max 280 chars. Draft only — do not post.`,
      `Original post:\n${input.originalPost}\n\nContext: ${input.context || "none"}`
    );
    return { draft, characterCount: draft.length, posted: false, ok: true };
  },
};

export const contentCalendar: SkillDefinition = {
  id: "content-calendar",
  name: "Content Calendar",
  slug: "content-calendar",
  category: "Social",
  description: "Plan a content calendar for X posts.",
  icon: "calendar-days",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    theme: z.string().min(1).describe("Content theme e.g. Solana dev updates"),
    days: z.number().min(1).max(14).optional(),
    postsPerDay: z.number().min(1).max(5).optional(),
  }),
  async execute(input, ctx) {
    const days = input.days ?? 7;
    await ctx.log("INFO", `Planning ${days}-day calendar`, "content-calendar");
    const raw = await runLlm(
      ctx.userId,
      "Create a content calendar as JSON array with fields: day, title, postType, draftHook. Output valid JSON only.",
      `Theme: ${input.theme}\nDays: ${days}\nPosts per day: ${input.postsPerDay ?? 1}`
    );
    let entries: unknown[] = [];
    try {
      entries = JSON.parse(raw.replace(/```json?\s*|\s*```/g, ""));
    } catch {
      entries = [{ day: 1, title: input.theme, postType: "update", draftHook: raw.slice(0, 200) }];
    }
    return { theme: input.theme, days, entries, ok: true };
  },
};

export const engagementAnalyzer: SkillDefinition = {
  id: "engagement-analyzer",
  name: "Engagement Analyzer",
  slug: "engagement-analyzer",
  category: "Social",
  description: "Analyze X engagement from timeline data or provided posts.",
  icon: "bar-chart-2",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    username: z.string().optional().describe("X username to analyze"),
    posts: z.array(z.string()).optional().describe("Post texts to analyze"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Analyzing engagement", "engagement-analyzer");
    let posts = input.posts ?? [];

    if (input.username && posts.length === 0) {
      const client = await getTwitterClientForUser(ctx.userId);
      if (client) {
        const user = await client.v2.userByUsername(input.username.replace("@", ""));
        const id = user.data?.id;
        if (id) {
          const timeline = await client.v2.userTimeline(id, { max_results: 10, exclude: ["retweets"] });
          posts = (timeline.data?.data ?? []).map((t) => t.text ?? "");
        }
      }
    }

    if (posts.length === 0) {
      return { ok: false, error: "Provide posts[] or connect X and specify username" };
    }

    const analysis = await runLlm(
      ctx.userId,
      "Analyze social post engagement patterns. Return JSON: { themes, bestHooks, suggestions, avgTone }",
      posts.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")
    );

    return { postCount: posts.length, analysis, ok: true };
  },
};
