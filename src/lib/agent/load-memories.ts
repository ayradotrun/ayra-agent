import { prisma } from "@/lib/prisma";
import { agentMemorySmartSearch, isAgentMemoryAvailable } from "@/lib/agentmemory/client";

export interface AgentMemorySnippet {
  content: string;
  source: "postgres" | "agentmemory";
}

export async function loadAgentMemoryContext(params: {
  agentId: string;
  memoryEnabled: boolean;
  agentMemoryEnabled?: boolean;
  agentMemoryUrl?: string | null;
  searchQuery?: string;
  postgresLimit?: number;
  agentMemoryLimit?: number;
}): Promise<AgentMemorySnippet[]> {
  if (!params.memoryEnabled) return [];

  const postgresLimit = params.postgresLimit ?? 4;
  const agentMemoryLimit = params.agentMemoryLimit ?? 3;

  const recentPromise = prisma.agentMemory.findMany({
    where: { agentId: params.agentId },
    orderBy: { createdAt: "desc" },
    take: postgresLimit,
  });

  const agentMemoryPromise =
    params.agentMemoryEnabled && params.searchQuery?.trim()
      ? (async () => {
          const available = await isAgentMemoryAvailable(params.agentMemoryUrl);
          if (!available) return [] as AgentMemorySnippet[];
          const hits = await agentMemorySmartSearch(params.searchQuery!.trim(), {
            limit: agentMemoryLimit,
            userUrl: params.agentMemoryUrl,
          });
          return hits.map((hit) => ({
            content: hit.content,
            source: "agentmemory" as const,
          }));
        })()
      : Promise.resolve([] as AgentMemorySnippet[]);

  const [recent, agentHits] = await Promise.all([recentPromise, agentMemoryPromise]);

  const snippets: AgentMemorySnippet[] = recent.map((mem) => ({
    content: mem.content,
    source: "postgres",
  }));

  for (const hit of agentHits) {
    if (!snippets.some((s) => s.content === hit.content)) {
      snippets.push(hit);
    }
  }

  return snippets.slice(0, postgresLimit + agentMemoryLimit);
}
