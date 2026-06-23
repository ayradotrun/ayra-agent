import { z } from "zod";
import type { SkillDefinition } from "./base";
import { prisma } from "@/lib/prisma";
import { agentMemorySave } from "@/lib/agentmemory/client";

export const memoryStorage: SkillDefinition = {
  id: "memory-storage",
  name: "Memory Storage",
  slug: "memory-storage",
  category: "Agent Core",
  description: "Store a memory entry for the agent to recall later.",
  icon: "brain",
  permission: "write",
  isEnabled: true,
  inputSchema: z.object({
    text: z.string().min(1).describe("Text to store in memory"),
    tags: z.array(z.string()).optional().describe("Optional tags"),
  }),
  async execute(input, ctx) {
    await ctx.log("INFO", "Storing memory", "memory-storage");

    const memory = await prisma.agentMemory.create({
      data: {
        agentId: ctx.agentId,
        content: input.text,
        tags: input.tags ?? [],
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { agentMemoryEnabled: true, agentMemoryUrl: true },
    });
    if (user?.agentMemoryEnabled) {
      await agentMemorySave(input.text, {
        tags: input.tags,
        userUrl: user.agentMemoryUrl,
        sessionId: ctx.agentId,
      });
    }

    await ctx.log("INFO", `Memory stored: ${memory.id}`, "memory-storage");
    return { memoryId: memory.id, saved: true };
  },
};
