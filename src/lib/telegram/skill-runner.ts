import { prisma } from "@/lib/prisma";
import { getSkill } from "@/lib/skills";
import { formatToolResult } from "@/lib/agent/format-reply";
import { formatTokenCard, lookupToken } from "@/lib/agent/token-card";

export async function runSkillFast(
  userId: string,
  agentId: string,
  slug: string,
  input: Record<string, unknown>,
  fallbackMsg: string
): Promise<{ handled: boolean; message?: string }> {
  const skill = getSkill(slug);
  if (!skill) return { handled: false, message: `❌ Skill \`${slug}\` not available.` };

  const run = await prisma.agentRun.create({ data: { agentId, status: "RUNNING" } });

  const logFn = async (
    level: "DEBUG" | "INFO" | "WARN" | "ERROR",
    message: string,
    toolUsed?: string
  ) => {
    await prisma.agentLog.create({ data: { agentId, runId: run.id, level, message, toolUsed } });
  };

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { name: true },
    });
    const result = await skill.execute(input, { agentId, userId, runId: run.id, log: logFn });
    const message =
      formatToolResult(result, { agentName: agent?.name ?? undefined, skillSlug: slug }) ||
      fallbackMsg;
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        toolCalls: 1,
        output: message,
        summary: message.slice(0, 500),
      },
    });
    return { handled: true, message };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : fallbackMsg;
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", completedAt: new Date(), error: errMsg, summary: errMsg },
    });
    return { handled: true, message: `❌ ${errMsg}` };
  }
}

export async function runTokenLookupFast(
  userId: string,
  agentId: string,
  query: string
): Promise<{ handled: boolean; message?: string }> {
  const run = await prisma.agentRun.create({ data: { agentId, status: "RUNNING" } });

  const logFn = async (
    level: "DEBUG" | "INFO" | "WARN" | "ERROR",
    message: string,
    toolUsed?: string
  ) => {
    await prisma.agentLog.create({ data: { agentId, runId: run.id, level, message, toolUsed } });
  };

  try {
    await logFn("INFO", `Token lookup: ${query}`, "token-quick-lookup");
    const result = await lookupToken(query);
    const message = formatTokenCard(result);

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        toolCalls: 1,
        output: message,
        summary: message.slice(0, 500),
      },
    });
    return { handled: true, message };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Token lookup failed";
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", completedAt: new Date(), error: errMsg, summary: errMsg },
    });
    return { handled: true, message: `❌ ${errMsg}` };
  }
}
