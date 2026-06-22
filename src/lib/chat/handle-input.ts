import { prisma } from "@/lib/prisma";
import {
  CHAT_MODEL_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  formatTelegramModelList,
  getModelLabel,
  isValidModelId,
  normalizeModelId,
  resolveModelQuery,
} from "@/lib/models";
import {
  resolveTelegramDefaultAgent,
  resolveChatModel,
  resolveImageModel,
  ensureAgentModelsMatchUser,
  syncUserChatModel,
  syncUserImageModel,
} from "@/lib/user-models";
import { tryTelegramFastPath } from "@/lib/telegram/fast-path";
import { CHAT_HELP_TEXT, TELEGRAM_HELP_TEXT } from "@/lib/telegram/commands";
import { cmdIs, cmdStarts } from "@/lib/telegram/command-utils";
import { parseSkillCommand } from "@/lib/telegram/skill-commands";
import { runSkillFast, runTokenLookupFast } from "@/lib/telegram/skill-runner";
import { generateImageForAgent } from "@/lib/chat/image-gen";

export interface HandleChatInputOptions {
  /** Dashboard chat: /use switches this session's agent */
  chatSessionId?: string;
  /** Return Telegram markdown instead of plain text */
  telegram?: boolean;
}

export interface HandleChatInputResult {
  handled: boolean;
  content?: string;
  imageUrls?: string[];
  imagePaths?: string[];
  /** After /use — new agent for this chat session */
  switchAgentId?: string;
  switchAgentName?: string;
}

function helpText(telegram?: boolean): string {
  return telegram ? TELEGRAM_HELP_TEXT : CHAT_HELP_TEXT;
}

function stripTelegramMarkdown(text: string): string {
  return text
    .replace(/\\([[\]()~`>#+\-=|{}.!])/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function formatReply(text: string, telegram?: boolean): string {
  return telegram ? text : stripTelegramMarkdown(text);
}

async function resolveAgentRecord(userId: string, agentId: string) {
  return prisma.agent.findFirst({
    where: { id: agentId, userId, status: "ACTIVE" },
    select: { id: true, name: true, model: true, imageModel: true, status: true },
  });
}

export async function handleChatInput(
  userId: string,
  agentId: string,
  text: string,
  options: HandleChatInputOptions = {}
): Promise<HandleChatInputResult> {
  const trimmed = text.trim();
  const { chatSessionId, telegram } = options;

  if (cmdIs(trimmed, "help", "start")) {
    return { handled: true, content: helpText(telegram) };
  }

  const skillCmd = parseSkillCommand(trimmed);
  if (skillCmd) {
    if ("error" in skillCmd) {
      return { handled: true, content: formatReply(skillCmd.error, telegram) };
    }

    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return {
        handled: true,
        content: "No active agent. Create one in the dashboard first.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramDefaultAgentId: true },
    });
    await ensureAgentModelsMatchUser(userId, agent.id, user?.telegramDefaultAgentId);

    let result;
    if (skillCmd.def.skillSlug === "token-quick-lookup") {
      result = await runTokenLookupFast(userId, agent.id, String(skillCmd.input.query));
    } else {
      result = await runSkillFast(
        userId,
        agent.id,
        skillCmd.def.skillSlug,
        skillCmd.input,
        "Command failed."
      );
    }

    if (result.message) {
      return { handled: true, content: formatReply(result.message, telegram) };
    }
    return { handled: true, content: "Command completed." };
  }

  if (cmdIs(trimmed, "status")) {
    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return {
        handled: true,
        content: "No active agent found. Create one in the dashboard first.",
      };
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultModel: true, defaultImageModel: true },
    });
    const chatModel = resolveChatModel(agent.model, dbUser?.defaultModel);
    const imageModel = resolveImageModel(agent.imageModel, dbUser?.defaultImageModel);
    const content = telegram
      ? `*${agent.name}*\nChat: \`${chatModel}\`\nImage: \`${imageModel}\`\nID: \`${agent.id.slice(0, 8)}…\`\n\n_Synced with Dashboard → Settings_`
      : `${agent.name}\nChat: ${chatModel}\nImage: ${imageModel}\nID: ${agent.id.slice(0, 8)}…\n\nSynced with Dashboard → Settings`;
    return { handled: true, content };
  }

  if (trimmed === "/models" || trimmed === "/models chat" || trimmed === "/models image") {
    const modelOptions =
      trimmed === "/models chat"
        ? CHAT_MODEL_OPTIONS
        : trimmed === "/models image"
          ? IMAGE_MODEL_OPTIONS
          : [...CHAT_MODEL_OPTIONS, ...IMAGE_MODEL_OPTIONS];
    const list = formatTelegramModelList(modelOptions);
    return { handled: true, content: formatReply(list, telegram) };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramDefaultAgentId: true, defaultModel: true, defaultImageModel: true },
  });

  if (trimmed === "/model" || trimmed.startsWith("/model ")) {
    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return { handled: true, content: "No active agent. Create one in the dashboard first." };
    }

    const query = trimmed.slice(6).trim();
    if (!query) {
      const chatModel = resolveChatModel(agent.model, user?.defaultModel);
      const content = telegram
        ? `Chat model: *${getModelLabel(chatModel)}*\n\`${chatModel}\`\n\nChange: \`/model [name]\` or Dashboard → Settings`
        : `Chat model: ${getModelLabel(chatModel)}\n${chatModel}\n\nChange: /model [name] or Dashboard → Settings`;
      return { handled: true, content };
    }

    const match = resolveModelQuery(query, CHAT_MODEL_OPTIONS);
    if (!match) {
      return {
        handled: true,
        content: formatReply("Model not found. Use `/models chat` to see options.", telegram),
      };
    }

    await syncUserChatModel(userId, match.value, user?.telegramDefaultAgentId);
    const content = telegram
      ? `✅ Chat model → *${match.label}*\n\`${match.value}\`\n_Synced to Dashboard Settings_`
      : `✅ Chat model → ${match.label}\n${match.value}\nSynced to Dashboard Settings`;
    return { handled: true, content };
  }

  if (trimmed === "/custommodel" || trimmed.startsWith("/custommodel ")) {
    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return { handled: true, content: "No active agent. Create one in the dashboard first." };
    }

    const query = trimmed.slice(12).trim();
    const chatModel = resolveChatModel(agent.model, user?.defaultModel);

    if (!query) {
      const content = telegram
        ? `Custom chat model: \`${chatModel}\`\n\nSet: \`/custommodel [provider/model-id]\``
        : `Custom chat model: ${chatModel}\n\nSet: /custommodel [provider/model-id]`;
      return { handled: true, content };
    }

    if (!isValidModelId(query)) {
      return {
        handled: true,
        content: formatReply(
          "Invalid model ID. Use OpenRouter format: `provider/model-id`",
          telegram
        ),
      };
    }

    const modelId = normalizeModelId(query);
    await syncUserChatModel(userId, modelId, user?.telegramDefaultAgentId);
    const content = telegram
      ? `✅ Custom chat model → \`${modelId}\`\n_Synced to Dashboard Settings_`
      : `✅ Custom chat model → ${modelId}\nSynced to Dashboard Settings`;
    return { handled: true, content };
  }

  if (trimmed === "/imagemodel" || trimmed.startsWith("/imagemodel ")) {
    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return { handled: true, content: "No active agent. Create one in the dashboard first." };
    }

    const query = trimmed.slice(11).trim();
    const current = resolveImageModel(agent.imageModel, user?.defaultImageModel);

    if (!query) {
      const content = telegram
        ? `Image model: *${getModelLabel(current)}*\n\`${current}\`\n\nChange: \`/imagemodel [name]\` or Dashboard → Settings`
        : `Image model: ${getModelLabel(current)}\n${current}\n\nChange: /imagemodel [name] or Dashboard → Settings`;
      return { handled: true, content };
    }

    const match = resolveModelQuery(query, IMAGE_MODEL_OPTIONS);
    if (!match) {
      return {
        handled: true,
        content: formatReply("Image model not found. Use `/models image` to see options.", telegram),
      };
    }

    await syncUserImageModel(userId, match.value, user?.telegramDefaultAgentId);
    const content = telegram
      ? `✅ Image model → *${match.label}*\n\`${match.value}\`\n_Synced to Dashboard Settings_`
      : `✅ Image model → ${match.label}\n${match.value}\nSynced to Dashboard Settings`;
    return { handled: true, content };
  }

  if (trimmed === "/customimagemodel" || trimmed.startsWith("/customimagemodel ")) {
    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return { handled: true, content: "No active agent. Create one in the dashboard first." };
    }

    const query = trimmed.slice(17).trim();
    const current = resolveImageModel(agent.imageModel, user?.defaultImageModel);

    if (!query) {
      const content = telegram
        ? `Custom image model: \`${current}\`\n\nSet: \`/customimagemodel [provider/model-id]\``
        : `Custom image model: ${current}\n\nSet: /customimagemodel [provider/model-id]`;
      return { handled: true, content };
    }

    if (!isValidModelId(query)) {
      return {
        handled: true,
        content: formatReply(
          "Invalid model ID. Use OpenRouter format: `provider/model-id`",
          telegram
        ),
      };
    }

    const modelId = normalizeModelId(query);
    await syncUserImageModel(userId, modelId, user?.telegramDefaultAgentId);
    const content = telegram
      ? `✅ Custom image model → \`${modelId}\`\n_Synced to Dashboard Settings_`
      : `✅ Custom image model → ${modelId}\nSynced to Dashboard Settings`;
    return { handled: true, content };
  }

  const imageCmd = cmdStarts(trimmed, "image");
  if (imageCmd) {
    const prompt = imageCmd.args.trim();
    if (!prompt) {
      return { handled: true, content: "Usage: /image [prompt]" };
    }

    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return { handled: true, content: "No active agent. Create one in the dashboard first." };
    }

    await ensureAgentModelsMatchUser(userId, agent.id, user?.telegramDefaultAgentId);
    const result = await generateImageForAgent(userId, agent.id, prompt);
    if (!result.ok || !result.imageUrls?.length) {
      return { handled: true, content: `❌ ${result.message}` };
    }

    return {
      handled: true,
      content: formatReply(result.message, telegram),
      imageUrls: result.imageUrls,
      imagePaths: result.imagePaths,
    };
  }

  if (cmdIs(trimmed, "agents")) {
    const agents = await prisma.agent.findMany({
      where: { userId },
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    if (agents.length === 0) {
      return { handled: true, content: "No agents yet. Create one at your AYRA dashboard." };
    }
    const list = agents
      .map((a) => `• ${a.name} (${a.status}) — ${a.id.slice(0, 8)}…`)
      .join("\n");
    const content = telegram
      ? `*Your agents:*\n${list}\n\nSet default: /use Agent Name`
      : `Your agents:\n${list}\n\nSwitch agent: /use Agent Name`;
    return { handled: true, content };
  }

  const useCmd = cmdStarts(trimmed, "use");
  if (useCmd) {
    const nameQuery = useCmd.args.toLowerCase();
    if (!nameQuery) {
      return { handled: true, content: "Usage: /use [agent name or id prefix]" };
    }

    const agents = await prisma.agent.findMany({ where: { userId } });
    const match =
      agents.find((a) => a.id.startsWith(nameQuery)) ||
      agents.find((a) => a.name.toLowerCase().includes(nameQuery));

    if (!match) {
      return { handled: true, content: "Agent not found. Use /agents to see the list." };
    }

    if (chatSessionId) {
      await prisma.chatSession.update({
        where: { id: chatSessionId },
        data: { agentId: match.id },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { telegramDefaultAgentId: match.id },
      });
    }

    const content = telegram
      ? `✅ Default agent set to *${match.name}*`
      : `✅ Agent switched to ${match.name}`;
    return {
      handled: true,
      content,
      switchAgentId: match.id,
      switchAgentName: match.name,
    };
  }

  const agent = await resolveAgentRecord(userId, agentId);
  if (!agent) {
    return {
      handled: true,
      content: "No active agent. Create one in the dashboard, then try again.",
    };
  }

  await ensureAgentModelsMatchUser(userId, agent.id, user?.telegramDefaultAgentId);

  const fast = await tryTelegramFastPath(userId, agent.id, trimmed);
  if (fast.handled && fast.message) {
    return {
      handled: true,
      content: formatReply(fast.message, telegram),
      imagePaths: fast.imagePaths,
      imageUrls: fast.imagePaths
        ?.map((p) => {
          const name = p.split(/[/\\]/).pop();
          return name ? `/api/generated/${name}` : null;
        })
        .filter((u): u is string => !!u),
    };
  }

  return { handled: false };
}

/** Resolve agent id for telegram before running LLM (uses user default) */
export async function resolveAgentIdForTelegram(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramDefaultAgentId: true },
  });
  const agent = await resolveTelegramDefaultAgent(userId, user?.telegramDefaultAgentId);
  return agent?.id ?? null;
}
