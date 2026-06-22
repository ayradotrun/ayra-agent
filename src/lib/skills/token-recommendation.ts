import { z } from "zod";
import type { SkillDefinition } from "./base";
import { callOpenRouter } from "@/lib/openrouter";
import { fetchUserLlmParams } from "@/lib/skills/helpers";
import { prisma } from "@/lib/prisma";
import { getMintInfo, getSolanaRpcOptions } from "@/lib/solana";

const inputSchema = z.object({
  mint: z.string().optional().describe("Solana token mint to analyze"),
  topic: z.string().min(1).describe("Research topic or token name"),
  context: z.string().optional().describe("Extra context from the user"),
});

export const tokenRecommendation: SkillDefinition = {
  id: "token-recommendation",
  name: "Token Research",
  slug: "token-recommendation",
  category: "Crypto",
  description: "Research a Solana token and produce a structured dev-focused briefing. Not financial advice.",
  icon: "trending-up",
  permission: "read",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    await ctx.log("INFO", `Researching: ${input.topic}`, "token-recommendation");

    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const llm = await fetchUserLlmParams(ctx.userId);

    let onChain: Record<string, unknown> = {};
    if (input.mint) {
      try {
        const rpc = getSolanaRpcOptions(user);
        onChain = await getMintInfo(input.mint, rpc);
      } catch {
        onChain = { mint: input.mint, onChainError: "Could not fetch mint data" };
      }
    }

    const response = await callOpenRouter({
      ...llm,
      messages: [
        {
          role: "system",
          content:
            "You are a Solana developer research assistant. Produce a structured briefing for builders: token mechanics, on-chain signals, risks, and watch items. NEVER invent prices, guarantees, or profit claims. NEVER say buy/sell. Label output as research only, not financial advice.",
        },
        {
          role: "user",
          content: `Topic: ${input.topic}\nContext: ${input.context || "none"}\nOn-chain data: ${JSON.stringify(onChain)}`,
        },
      ],
      maxTokens: 800,
    });

    const briefing = response.choices[0]?.message?.content?.trim() || "";

    return {
      topic: input.topic,
      mint: input.mint,
      onChain,
      briefing,
      disclaimer: "Research only — not financial advice. Verify all data independently.",
    };
  },
};
