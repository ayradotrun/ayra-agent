import { prisma } from "@/lib/prisma";

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
  _sessionModel: string | null | undefined,
  userDefaultModel: string | null | undefined,
  agentModel: string
): string {
  return userDefaultModel || agentModel;
}

export type AgentRequirementReason = "no_agents" | "all_paused";

export async function getChatAgentRequirement(userId: string): Promise<
  | { ok: true; agent: NonNullable<Awaited<ReturnType<typeof resolveChatAgent>>> }
  | { ok: false; reason: AgentRequirementReason; error: string }
> {
  const total = await prisma.agent.count({ where: { userId } });
  if (total === 0) {
    return {
      ok: false,
      reason: "no_agents",
      error: "Create an agent first before chatting.",
    };
  }

  const agent = await resolveChatAgent(userId);
  if (!agent) {
    return {
      ok: false,
      reason: "all_paused",
      error: "No active agent. Start a paused agent or create a new one.",
    };
  }

  return { ok: true, agent };
}

export function formatAgentRequiredReply(
  reason: AgentRequirementReason,
  telegram?: boolean
): string {
  const createLine = telegram
    ? "• *Create agent* — Dashboard → Agents → Create agent"
    : "• Create agent — Dashboard → Agents → Create agent";
  const startLine = telegram
    ? "• *Start agent* — Dashboard → Agents → open an agent → Run"
    : "• Start agent — Dashboard → Agents → open an agent → Run";

  if (reason === "no_agents") {
    if (telegram) {
      return (
        "🤖 *Set up an agent first*\n\n" +
        "Chat needs an agent before it can reply.\n\n" +
        `${createLine}\n` +
        "Then send your message again."
      );
    }
    return "Create an agent first before chatting. Go to Agents → Create agent.";
  }

  if (telegram) {
    return (
      "⏸️ *No running agent*\n\n" +
      "You already have agent(s), but none are active.\n\n" +
      `${startLine}\n` +
      `${createLine}\n` +
      "Or send /agents to list agents here."
    );
  }

  return "No active agent. Start a paused agent from Agents, or create a new one.";
}

/** Fast gate for Telegram — used before thinking indicator / LLM */
export async function getTelegramReadiness(userId: string): Promise<
  | { ok: true; agentId: string; agentName: string }
  | { ok: false; message: string }
> {
  const requirement = await getChatAgentRequirement(userId);
  if (!requirement.ok) {
    return {
      ok: false,
      message: formatAgentRequiredReply(requirement.reason, true),
    };
  }
  return {
    ok: true,
    agentId: requirement.agent.id,
    agentName: requirement.agent.name,
  };
}

export async function formatInactiveAgentReply(
  userId: string,
  telegram?: boolean
): Promise<string> {
  const requirement = await getChatAgentRequirement(userId);
  if (!requirement.ok) {
    return formatAgentRequiredReply(requirement.reason, telegram);
  }
  return telegram
    ? "This agent is not active. Open Dashboard → Agents and press *Run*."
    : "This agent is not active. Open Agents and press Run.";
}
