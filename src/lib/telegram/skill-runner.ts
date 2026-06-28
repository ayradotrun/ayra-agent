import { prisma } from "@/lib/prisma";
import { getSkill } from "@/lib/skills";
import { formatToolResult } from "@/lib/agent/format-reply";
import { formatTokenCard, lookupToken } from "@/lib/agent/token-card";
import { formatSearchFetchError } from "@/lib/search/web-search";

function formatSkillError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : fallback;
  if (message === "fetch failed" || message.includes("certificate")) {
    return formatSearchFetchError(error);
  }
  return message;
}

export async function runSkillFast(
  userId: string,
  agentId: string,
  slug: string,
  input: Record<string, unknown>,
  fallbackMsg: string,
  trigger = "telegram"
): Promise<{ handled: boolean; message?: string }> {
  const skill = getSkill(slug);
  if (!skill) return { handled: false, message: `❌ Skill \`${slug}\` not available.` };

  const run = await prisma.agentRun.create({
    data: { agentId, status: "RUNNING", trigger },
  });

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
    const record = result && typeof result === "object" ? (result as Record<string, unknown>) : null;
    if (record?.ok === false && typeof record.error === "string") {
      const errMsg = record.error;
      await prisma.agentRun.update({
        where: { id: run.id },
        data: { status: "FAILED", completedAt: new Date(), error: errMsg, summary: errMsg },
      });
      return { handled: true, message: `❌ ${errMsg}` };
    }
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
    const errMsg = formatSkillError(error, fallbackMsg);
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
  query: string,
  trigger = "telegram"
): Promise<{ handled: boolean; message?: string }> {
  const run = await prisma.agentRun.create({
    data: { agentId, status: "RUNNING", trigger },
  });

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
