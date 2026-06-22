import { z } from "zod";
import type { SkillDefinition } from "./base";
import { prisma } from "@/lib/prisma";
import { postTweet, canUserAutoPost } from "@/lib/x-api";

const inputSchema = z.object({
  text: z.string().min(1).max(280).describe("Tweet text to post or save as draft"),
  postNow: z.boolean().optional().describe("Attempt to post immediately if auto-post is enabled"),
});

export const xPost: SkillDefinition = {
  id: "x-post",
  name: "X Post",
  slug: "x-post",
  category: "Social",
  description: "Post to X when auto-post is enabled and credentials are configured. Otherwise saves as draft.",
  icon: "send",
  permission: "write",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    const text = input.text.slice(0, 280);
    await ctx.log("INFO", "Processing X post request", "x-post");

    const agent = await prisma.agent.findUnique({ where: { id: ctx.agentId } });
    const wantsPost = input.postNow === true;
    const canPost = agent
      ? await canUserAutoPost(ctx.userId, agent.autoPostX && wantsPost)
      : false;

    if (!canPost) {
      await ctx.log("INFO", "Draft only — auto-post disabled or missing credentials", "x-post");
      return {
        posted: false,
        draft: text,
        characterCount: text.length,
        note: "Saved as draft. Enable auto-post in Settings + Agent settings + X API keys to post.",
      };
    }

    try {
      const result = await postTweet(ctx.userId, text);
      await ctx.log("INFO", `Tweet posted: ${result.tweetId}`, "x-post");
      return { ...result, draft: text };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Post failed";
      await ctx.log("ERROR", message, "x-post");
      return { posted: false, draft: text, error: message };
    }
  },
};
