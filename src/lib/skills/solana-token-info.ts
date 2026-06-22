import { z } from "zod";
import type { SkillDefinition } from "./base";
import { getMintInfo, getSolanaRpcOptions } from "@/lib/solana";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  mint: z.string().min(32).max(50).describe("Solana token mint address"),
  rpcUrl: z.string().url().optional().describe("Optional Solana RPC URL"),
});

export const solanaTokenInfo: SkillDefinition = {
  id: "token-tracker",
  name: "Token Tracker",
  slug: "token-tracker",
  category: "Crypto",
  description: "Fetch on-chain metadata for a Solana token mint (supply, decimals, authorities).",
  icon: "coins",
  permission: "network",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    await ctx.log("INFO", `Fetching mint info: ${input.mint}`, "token-tracker");

    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);

    try {
      const info = await getMintInfo(input.mint, {
        rpcUrl: input.rpcUrl || rpc.rpcUrl,
        apiKey: rpc.apiKey,
      });
      await ctx.log("INFO", `Mint found: ${info.found}`, "token-tracker");
      return { ...info, ok: info.found };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.log("ERROR", message, "token-tracker");
      return { mint: input.mint, ok: false, error: message };
    }
  },
};
