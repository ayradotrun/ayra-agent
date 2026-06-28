import { z } from "zod";
import type { SkillDefinition } from "./base";
import { getSolanaRpcRequests, getSolanaRpcOptions } from "@/lib/solana";
import { prisma } from "@/lib/prisma";

export const solanaRpcMonitor: SkillDefinition = {
  id: "solana-rpc-monitor",
  name: "Solana RPC Monitor",
  slug: "solana-rpc-monitor",
  category: "Crypto",
  description: "Monitor Solana RPC health, current slot, and latency.",
  icon: "activity",
  permission: "network",
  isEnabled: true,
  inputSchema: z.object({
    rpcUrl: z.string().url().optional().describe("Solana RPC URL"),
  }),
  async execute(input, ctx) {
    const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
    const userRpc = getSolanaRpcOptions(user);
    const requests = getSolanaRpcRequests({
      rpcUrl: input.rpcUrl || userRpc.rpcUrl,
      apiKey: userRpc.apiKey,
      fallbackRpcUrls: userRpc.fallbackRpcUrls,
      userScoped: true,
    });
    const primary = requests[0];
    await ctx.log("INFO", `Checking Solana RPC: ${primary.label}`, "solana-rpc-monitor");

    const start = Date.now();
    try {
      const response = await fetch(primary.url, {
        method: "POST",
        headers: primary.headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSlot",
        }),
      });

      const latency = Date.now() - start;

      if (!response.ok) {
        throw new Error(`RPC returned ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "RPC error");
      }

      const slot = data.result;
      const health = latency < 1000 ? "healthy" : latency < 3000 ? "degraded" : "slow";

      await ctx.log("INFO", `Slot: ${slot}, latency: ${latency}ms`, "solana-rpc-monitor");
      return {
        currentSlot: slot,
        latencyMs: latency,
        health,
        endpoint: primary.label,
        ok: true,
      };
    } catch (error) {
      const latency = Date.now() - start;
      const message = error instanceof Error ? error.message : "Unknown error";
      await ctx.log("ERROR", `Solana RPC check failed: ${message}`, "solana-rpc-monitor");
      return {
        currentSlot: null,
        latencyMs: latency,
        health: "error",
        endpoint: primary.label,
        ok: false,
        error: message,
      };
    }
  },
};
