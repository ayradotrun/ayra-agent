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

export async function getChatAgentRequirement(userId: string): Promise<
  | { ok: true; agent: NonNullable<Awaited<ReturnType<typeof resolveChatAgent>>> }
  | { ok: false; error: string }
> {
  const total = await prisma.agent.count({ where: { userId } });
  if (total === 0) {
    return {
      ok: false,
      error: "Create an agent first before chatting. Go to Agents → Create agent.",
    };
  }

  const agent = await resolveChatAgent(userId);
  if (!agent) {
    return {
      ok: false,
      error: "No active agent. Resume a paused agent or create a new one in Agents.",
    };
  }

  return { ok: true, agent };
}

export function formatAgentRequiredReply(error: string, telegram?: boolean): string {
  if (!telegram) return error;

  if (error.includes("Create an agent first")) {
    return (
      "🤖 *Buat agent dulu*\n\n" +
      "Chat butuh agent sebelum bisa membalas.\n\n" +
      "Buka *Dashboard → Agents → Create agent*, lalu kirim pesan lagi."
    );
  }

  if (error.includes("No active agent")) {
    return (
      "⏸️ *Tidak ada agent aktif*\n\n" +
      "Aktifkan agent yang di-pause atau buat agent baru di dashboard.\n\n" +
      "*Dashboard → Agents*"
    );
  }

  return error;
}

/** Fast gate for Telegram — used before thinking indicator / LLM */
export async function getTelegramReadiness(userId: string): Promise<
  | { ok: true; agentId: string; agentName: string }
  | { ok: false; message: string }
> {
  const requirement = await getChatAgentRequirement(userId);
  if (!requirement.ok) {
    return { ok: false, message: formatAgentRequiredReply(requirement.error, true) };
  }
  return {
    ok: true,
    agentId: requirement.agent.id,
    agentName: requirement.agent.name,
  };
}
