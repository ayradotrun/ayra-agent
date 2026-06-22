import { z } from "zod";
import type { SkillDefinition } from "./base";
import { getSolBalance, getTokenAccounts, getSolanaRpcOptions } from "@/lib/solana";
import { prisma } from "@/lib/prisma";

const inputSchema = z.object({
  wallet: z.string().min(32).max(50).describe("Solana wallet address"),
  rpcUrl: z.string().url().optional().describe("Optional Solana RPC URL"),
});

export const solanaWalletTracker: SkillDefinition = {
  id: "wallet-tracker",
  name: "Wallet Tracker",
  slug: "wallet-tracker",
  category: "Crypto",
  description: "Track SOL balance and SPL token holdings for a Solana wallet.",
  icon: "wallet",
  permission: "network",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    await ctx.log("INFO", `Tracking wallet: ${input.wallet}`, "wallet-tracker");

    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const rpc = getSolanaRpcOptions(user);

    try {
      const balance = await getSolBalance(input.wallet, {
        rpcUrl: input.rpcUrl || rpc.rpcUrl,
        apiKey: rpc.apiKey,
      });
      const tokens = await getTokenAccounts(input.wallet, {
        rpcUrl: input.rpcUrl || rpc.rpcUrl,
        apiKey: rpc.apiKey,
      });

      await ctx.log("INFO", `Balance: ${balance.sol} SOL, ${tokens.length} tokens`, "wallet-tracker");

      return {
        wallet: input.wallet,
        solBalance: balance.sol,
        lamports: balance.lamports,
        tokenCount: tokens.length,
        tokens: tokens.slice(0, 20),
        ok: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.log("ERROR", message, "wallet-tracker");
      return { wallet: input.wallet, ok: false, error: message };
    }
  },
};
