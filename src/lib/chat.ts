import { prisma } from "@/lib/db";

export async function resolveChatAgent(userId: string, agentId?: string | null) {
  if (agentId) {
    return prisma.agent.findFirst({
      where: { id: agentId, userId, status: "ACTIVE" },
      select: { id: true, name: true, model: true },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramDefaultAgentId: true },
  });

  if (user?.telegramDefaultAgentId) {
    const preferred = await prisma.agent.findFirst({
      where: { id: user.telegramDefaultAgentId, userId, status: "ACTIVE" },
      select: { id: true, name: true, model: true },
    });
    if (preferred) return preferred;
  }

  return prisma.agent.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, model: true },
  });
}

export function sessionTitleFromMessage(message: string): string {
  const line = message.trim().split(/\r?\n/)[0] ?? "New chat";
  if (!line && message) return "Image chat";
  return line.length > 60 ? `${line.slice(0, 57)}…` : line || "New chat";
}

export function resolveEffectiveChatModel(
  sessionModel: string | null | undefined,
  userDefaultModel: string | null | undefined,
  agentModel: string
): string {
  return sessionModel || userDefaultModel || agentModel;
}
