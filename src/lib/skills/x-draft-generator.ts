import { z } from "zod";
import type { SkillDefinition } from "./base";
import { callOpenRouter } from "@/lib/openrouter";
import { fetchUserLlmParams } from "@/lib/skills/helpers";

export const xDraftGenerator: SkillDefinition = {
  id: "x-draft-generator",
  name: "X Draft Generator",
  slug: "x-draft-generator",
  category: "Social",
  description: "Generate social media post drafts. Does not auto-post.",
  icon: "pen-line",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    topic: z.string().min(1).describe("Topic or context for the draft"),
    tone: z.enum(["professional", "casual", "technical", "witty"]).optional().describe("Tone of the draft"),
    maxLength: z.number().min(50).max(500).optional().describe("Max character length"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Generating X draft for: ${input.topic}`, "x-draft-generator");

    const llm = await fetchUserLlmParams(ctx.userId);
    const tone = input.tone || "professional";
    const maxLength = input.maxLength || 280;

    try {
      const response = await callOpenRouter({
        ...llm,
        messages: [
          {
            role: "system",
            content: `You generate social media post drafts for X (Twitter). Tone: ${tone}. Max ${maxLength} characters. Never include hashtags unless relevant. Output only the draft text, no explanations. This is a DRAFT only — it will NOT be posted automatically.`,
          },
          {
            role: "user",
            content: `Create a draft post about: ${input.topic}`,
          },
        ],
        maxTokens: 300,
      });

      const draft = response.choices[0]?.message?.content?.trim() || "";
      await ctx.log("INFO", "X draft generated", "x-draft-generator");

      return {
        draft,
        characterCount: draft.length,
        posted: false,
        note: "Draft only — not posted to X",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.log("ERROR", `Draft generation failed: ${message}`, "x-draft-generator");
      return { draft: "", characterCount: 0, posted: false, error: message };
    }
  },
};
