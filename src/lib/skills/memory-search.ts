import { z } from "zod";
import type { SkillDefinition } from "./base";
import { prisma } from "@/lib/prisma";
import { agentMemorySmartSearch } from "@/lib/agentmemory/client";

export const memorySearch: SkillDefinition = {
  id: "memory-search",
  name: "Memory Search",
  slug: "memory-search",
  category: "Agent Core",
  description: "Search agent memories by keyword query.",
  icon: "search",
  permission: "read",
  isEnabled: true,
  inputSchema: z.object({
    query: z.string().min(1).describe("Search query"),
    limit: z.number().min(1).max(20).optional().describe("Max results"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", `Searching memories: "${input.query}"`, "memory-search");
    const limit = input.limit ?? 5;
    const query = input.query.toLowerCase();

    const memories = await prisma.agentMemory.findMany({
      where: { agentId: ctx.agentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const relevant: Array<{
      id: string;
      content: string;
      tags: string[];
      createdAt: string;
      source: "postgres" | "agentmemory";
    }> = memories
      .filter(
        (m) =>
          m.content.toLowerCase().includes(query) ||
          m.tags.some((t) => t.toLowerCase().includes(query))
      )
      .slice(0, limit)
      .map((m) => ({
        id: m.id,
        content: m.content,
        tags: m.tags,
        createdAt: m.createdAt.toISOString(),
        source: "postgres" as const,
      }));

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { agentMemoryEnabled: true, agentMemoryUrl: true },
    });

    if (user?.agentMemoryEnabled) {
      const hits = await agentMemorySmartSearch(input.query, {
        limit,
        userUrl: user.agentMemoryUrl,
      });
      for (const hit of hits) {
        if (!relevant.some((r) => r.content === hit.content)) {
          relevant.push({
            id: `agentmemory-${relevant.length}`,
            content: hit.content,
            tags: [],
            createdAt: new Date().toISOString(),
            source: "agentmemory",
          });
        }
      }
    }

    await ctx.log("INFO", `Found ${relevant.length} relevant memories`, "memory-search");
    return { memories: relevant.slice(0, limit), count: relevant.length };
  },
};
