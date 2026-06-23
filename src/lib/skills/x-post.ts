import { z } from "zod";
import type { SkillDefinition } from "./base";
import { prisma } from "@/lib/prisma";
import { postTweet, resolveAutoPostReadiness } from "@/lib/x-api";

const inputSchema = z.object({
  text: z.string().min(1).max(280).describe("Tweet text to post or save as draft"),
  postNow: z
    .boolean()
    .optional()
    .describe("true = publish now when auto-post enabled; false = draft only; omit = publish if auto-post ready"),
});

export const xPost: SkillDefinition = {
  id: "x-post",
  name: "X Post",
  slug: "x-post",
  category: "Social",
  description:
    "Post tweet text to X (Twitter). Function name: x_post. When account + agent auto-post are enabled, call with text to publish; set postNow true to force publish, false for draft only.",
  icon: "send",
  permission: "write",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    const text = input.text.slice(0, 280);
    await ctx.log("INFO", "Processing X post request", "x-post");

    const agent = await prisma.agent.findUnique({ where: { id: ctx.agentId } });
    const readiness = agent
      ? await resolveAutoPostReadiness(ctx.userId, agent.autoPostX)
      : { ready: false, message: "Agent not found.", reason: "agent_auto_post_disabled" as const };

    const shouldPost =
      input.postNow !== false &&
      readiness.ready &&
      (input.postNow === true || input.postNow === undefined);

    if (!shouldPost) {
      await ctx.log("INFO", `Draft only — ${readiness.message}`, "x-post");
      return {
        posted: false,
        draft: text,
        characterCount: text.length,
        note: readiness.message,
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
