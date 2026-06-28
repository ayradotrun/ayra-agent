import { z } from "zod";
import type { SkillDefinition } from "./base";
import { getSolBalance, getTokenAccounts, getSolanaRpcOptions } from "@/lib/solana";
import { prisma } from "@/lib/prisma";
import {
  balancesFromHelius,
  checkFundBundled,
  checkTokenBundled,
  enrichFundingSource,
  getFundingSource,
  getHeliusApiKeyForUser,
  getTokenTransfers,
  getWalletBalances,
  getWalletIdentity,
} from "@/lib/helius/wallet-analyzer";
import { listSecretFlags } from "@/lib/secrets/secret-store";
import { enrichTokenHoldings } from "@/lib/token-holdings";

const inputSchema = z.object({
  wallet: z.string().min(32).max(50).describe("Solana wallet address"),
  mint: z
    .string()
    .min(32)
    .max(50)
    .optional()
    .describe("Optional token mint (CA) for transfer + bundle analysis"),
  rpcUrl: z.string().url().optional().describe("Optional Solana RPC URL"),
});

export const solanaWalletTracker: SkillDefinition = {
  id: "wallet-tracker",
  name: "Wallet Analyzer",
  slug: "wallet-tracker",
  category: "Crypto",
  description:
    "Analyze a Solana wallet: balance, SPL holdings, funding source, bundle/sybil flags, and optional token transfer analysis (Helius). Based on walletanalyzer.",
  icon: "wallet",
  permission: "network",
  isEnabled: true,
  inputSchema,
  async execute(input, ctx) {
    await ctx.log("INFO", `Wallet analyze: ${input.wallet}`, "wallet-tracker");

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        solanaDefaultRpc: true,
        solanaRpcApiKey: true,
        fallbackRpcUrls: true,
      },
    });
    const rpc = getSolanaRpcOptions(user);
    const rpcCall = {
      rpcUrl: input.rpcUrl || rpc.rpcUrl,
      apiKey: rpc.apiKey,
      fallbackRpcUrls: rpc.fallbackRpcUrls,
      userScoped: true as const,
    };

    try {
      let balance = { lamports: 0, sol: 0 };
      let tokens: Array<{
        mint: string;
        amount: number;
        decimals: number;
        account: string;
        symbol?: string;
        name?: string;
      }> = [];
      let rpcError: string | undefined;

      try {
        balance = await getSolBalance(input.wallet, rpcCall);
        tokens = await getTokenAccounts(input.wallet, rpcCall);
      } catch (error) {
        rpcError = error instanceof Error ? error.message : "Solana RPC failed";
        await ctx.log("WARN", rpcError, "wallet-tracker");
      }

      const heliusKey = await getHeliusApiKeyForUser(ctx.userId);
      let funding = null;
      let identity = null;
      let isFundBundled = false;
      let tokenAnalysis: Record<string, unknown> | undefined;
      let heliusError: string | undefined;

      if (!heliusKey) {
        const flags = await listSecretFlags(ctx.userId);
        if (flags.hasSolanaRpcApiKey) {
          heliusError =
            "Could not decrypt your saved RPC API key. Re-enter it in Settings → Solana, or paste the full Helius URL with ?api-key=…";
        }
      } else {
        try {
          if (rpcError) {
            const heliusBalances = await getWalletBalances(input.wallet, heliusKey);
            const fromHelius = balancesFromHelius(heliusBalances);
            if (fromHelius.sol > 0 || fromHelius.tokens.length > 0) {
              balance = { lamports: fromHelius.lamports, sol: fromHelius.sol };
              tokens = fromHelius.tokens;
              rpcError = undefined;
            }
          }

          funding = await getFundingSource(input.wallet, heliusKey);
          if (funding) {
            funding = await enrichFundingSource(funding, heliusKey);
          }
          identity = await getWalletIdentity(input.wallet, heliusKey);
          isFundBundled = await checkFundBundled(funding, heliusKey);

          if (input.mint) {
            const transfers = await getTokenTransfers(input.wallet, heliusKey, input.mint);
            const bundle = await checkTokenBundled(transfers, input.mint, heliusKey);
            tokenAnalysis = {
              mint: input.mint,
              transferCount: transfers.length,
              recentTransfers: transfers.slice(0, 5).map((t) => ({
                direction: t.direction,
                counterparty: t.counterparty,
                timestamp: t.timestamp,
                signature: t.signature,
              })),
              isTokenBundled: bundle.isBundled,
              distributor: bundle.distributor ?? null,
              recipientCount: bundle.recipientCount ?? null,
            };
          }
        } catch (error) {
          heliusError = error instanceof Error ? error.message : "Helius request failed";
          await ctx.log("WARN", heliusError, "wallet-tracker");
        }
      }

      const positiveTokens = tokens.filter((t) => t.amount > 0);
      const enrichedTokens = await enrichTokenHoldings(positiveTokens, {
        heliusKey: heliusKey ?? undefined,
        wallet: input.wallet,
      });

      await ctx.log(
        "INFO",
        `Balance: ${balance.sol} SOL, tokens: ${enrichedTokens.length}, helius: ${heliusKey ? "yes" : "no"}`,
        "wallet-tracker"
      );

      return {
        ok: true,
        wallet: input.wallet,
        solBalance: Number.isFinite(balance.sol) ? balance.sol : 0,
        lamports: balance.lamports,
        tokenCount: enrichedTokens.length,
        tokens: enrichedTokens.slice(0, 20),
        funding,
        identity,
        isFundBundled,
        tokenAnalysis,
        heliusConfigured: !!heliusKey,
        heliusError,
        rpcError,
        source: "Solana RPC + Helius (walletanalyzer)",
        note: "Funding/bundle analysis needs a Helius RPC or API key in Dashboard → Settings → Solana. Not financial advice.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.log("ERROR", message, "wallet-tracker");
      return { wallet: input.wallet, ok: false, error: message };
    }
  },
};
