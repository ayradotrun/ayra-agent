import { prisma } from "@/lib/prisma";
import { DEFAULT_IMAGE_MODEL, DEFAULT_MODEL, normalizeChatModel } from "@/lib/models";

const TELEGRAM_CORE_SKILLS = [
  "sol-price-checker",
  "token-quick-lookup",
  "jupiter-price",
  "token-finder",
  "rugcheck",
  "token-price-tracker",
  "network-stats",
  "trending-tokens",
  "meme-coin-scanner",
  "token-quality-report",
  "image-generator",
] as const;

export async function ensureTelegramCoreSkills(agentId: string): Promise<void> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { template: true },
  });
  // Only auto-enable core skills for the full-capability default agent
  if (agent?.template !== "ayra-full") return;

  for (const slug of TELEGRAM_CORE_SKILLS) {
    const skill = await prisma.skill.findUnique({ where: { slug } });
    if (!skill) continue;

    await prisma.agentSkill.upsert({
      where: { agentId_skillId: { agentId, skillId: skill.id } },
      create: { agentId, skillId: skill.id, enabled: true },
      update: { enabled: true },
    });
  }
}

export async function resolveTelegramDefaultAgent(
  userId: string,
  telegramDefaultAgentId?: string | null
) {
  if (telegramDefaultAgentId) {
    const agent = await prisma.agent.findFirst({
      where: { id: telegramDefaultAgentId, userId, status: "ACTIVE" },
    });
    if (agent) return agent;
  }
  return prisma.agent.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
  });
}

/** Re-apply Settings → LLM models onto every agent (heals stale agent.model rows) */
export async function healAllAgentModelsFromUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultModel: true, defaultImageModel: true },
  });
  if (!user) return;
  await syncModelsToAllAgents(userId, {
    model: user.defaultModel ?? undefined,
    imageModel: user.defaultImageModel ?? undefined,
  });
}

/** Push User Settings chat/image models onto every agent for this user */
async function syncModelsToAllAgents(
  userId: string,
  patch: { model?: string; imageModel?: string }
): Promise<void> {
  const data: { model?: string; imageModel?: string } = {};
  if (patch.model) data.model = normalizeChatModel(patch.model);
  if (patch.imageModel) data.imageModel = patch.imageModel;
  if (Object.keys(data).length === 0) return;
  await prisma.agent.updateMany({ where: { userId }, data });
}

/** Sync chat model to User settings + all agents */
export async function syncUserChatModel(userId: string, model: string): Promise<void> {
  const normalized = normalizeChatModel(model);
  await prisma.user.update({
    where: { id: userId },
    data: { defaultModel: normalized },
  });
  await syncModelsToAllAgents(userId, { model: normalized });
}

/** Sync image model to User settings + all agents */
export async function syncUserImageModel(userId: string, model: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { defaultImageModel: model },
  });
  await syncModelsToAllAgents(userId, { imageModel: model });
}

/** User Settings (Dashboard/Telegram) take priority; legacy paid defaults are upgraded to free */
export function resolveChatModel(agentModel: string, userDefaultModel?: string | null): string {
  return normalizeChatModel(userDefaultModel || agentModel || DEFAULT_MODEL);
}

export function resolveImageModel(
  agentImageModel?: string | null,
  userDefaultImageModel?: string | null
): string {
  return (
    userDefaultImageModel ||
    agentImageModel ||
    process.env.DEFAULT_IMAGE_MODEL ||
    DEFAULT_IMAGE_MODEL
  );
}

/** Heal desync: apply User model defaults onto the agent before a run */
export async function ensureAgentModelsMatchUser(userId: string, agentId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      defaultModel: true,
      defaultImageModel: true,
    },
  });
  if (!user) return;

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
    select: { id: true, model: true, imageModel: true, template: true },
  });
  if (!agent) return;

  const chatModel = normalizeChatModel(user.defaultModel || agent.model);
  const data: { model?: string; imageModel?: string } = {};

  if (user.defaultModel && user.defaultModel !== chatModel) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultModel: chatModel },
    });
  }
  if (agent.model !== chatModel) {
    data.model = chatModel;
  }
  if (user.defaultImageModel && agent.imageModel !== user.defaultImageModel) {
    data.imageModel = user.defaultImageModel;
  }

  if (Object.keys(data).length > 0) {
    await prisma.agent.update({ where: { id: agentId }, data });
  }

  await ensureTelegramCoreSkills(agentId);
}
