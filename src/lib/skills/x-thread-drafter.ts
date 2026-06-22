import { z } from "zod";
import type { SkillDefinition } from "./base";
import { callOpenRouter } from "@/lib/openrouter";
import { fetchUserLlmParams } from "@/lib/skills/helpers";

const inputSchema = z.object({
  topic: z.string().min(1).describe("Topic for the thread"),
  tweets: z.number().min(2).max(8).optional().describe("Number of tweets in thread"),
});

export const xThreadDrafter: SkillDefinition = {
  id: "x-thread-drafter",
  name: "X Thread Drafter",
  slug: "x-thread-drafter",
  category: "Social",
  description: "Generate a multi-tweet thread draft for X. Does not auto-post.",
  icon: "pen-line",
  permission: "read",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    const count = input.tweets ?? 4;
    await ctx.log("INFO", `Drafting ${count}-tweet thread`, "x-thread-drafter");

    const llm = await fetchUserLlmParams(ctx.userId);

    const response = await callOpenRouter({
      ...llm,
      messages: [
        {
          role: "system",
          content: `Generate a ${count}-tweet thread for X/Twitter. Each tweet max 280 chars. Number them 1/${count}, 2/${count}, etc. Developer-focused, no hype, no profit claims. Output JSON array of strings.`,
        },
        { role: "user", content: `Thread topic: ${input.topic}` },
      ],
      maxTokens: 1200,
    });

    const raw = response.choices[0]?.message?.content?.trim() || "[]";
    let thread: string[] = [];
    try {
      thread = JSON.parse(raw);
    } catch {
      thread = raw.split(/\n\d+\/\d+/).map((s) => s.trim()).filter(Boolean);
    }

    return {
      topic: input.topic,
      thread,
      tweetCount: thread.length,
      posted: false,
      note: "Thread draft only — review before posting",
    };
  },
};
