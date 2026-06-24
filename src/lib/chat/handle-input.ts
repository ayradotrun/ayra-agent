import { prisma } from "@/lib/prisma";
import { listBrainTasks } from "@/lib/brain/brain-store";
import { updateChatSession } from "@/lib/chat/chat-store";
import {
  CHAT_MODEL_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  formatTelegramModelList,
  getModelLabel,
  isValidModelId,
  normalizeModelId,
  resolveModelQuery,
} from "@/lib/models";
import { getChatAgentRequirement, formatAgentRequiredReply, formatInactiveAgentReply } from "@/lib/chat";
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
import { runQualityReportWithAgent } from "@/lib/agent/quality-report-with-agent";
import { generateImageForAgent } from "@/lib/chat/image-gen";
import { postTweet, resolveAutoPostReadiness } from "@/lib/x-api";

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
    select: { id: true, name: true, model: true, imageModel: true, status: true, autoPostX: true },
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
  const runSource = telegram ? "telegram" : "chat";

  if (telegram) {
    const requirement = await getChatAgentRequirement(userId);
    if (!requirement.ok) {
      return {
        handled: true,
        content: formatAgentRequiredReply(requirement.reason, true),
      };
    }
  }

  if (cmdIs(trimmed, "help", "start")) {
    return { handled: true, content: helpText(telegram) };
  }

  const postCmd = cmdStarts(trimmed, "post");
  if (postCmd) {
    const tweetText = postCmd.args.trim();
    if (!tweetText) {
      return { handled: true, content: formatReply("Usage: /post [tweet text — max 280 characters]", telegram) };
    }

    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return { handled: true, content: "No active agent. Create one in the dashboard first." };
    }

    const postStatus = await resolveAutoPostReadiness(userId, agent.autoPostX);
    if (!postStatus.ready) {
      return { handled: true, content: formatReply(`❌ ${postStatus.message}`, telegram) };
    }

    try {
      const result = await postTweet(userId, tweetText);
      const link = `https://x.com/i/web/status/${result.tweetId}`;
      return {
        handled: true,
        content: formatReply(`✅ *Posted to X*\n\n${result.text}\n\n${link}`, telegram),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Post failed";
      return { handled: true, content: formatReply(`❌ ${message}`, telegram) };
    }
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

    await ensureAgentModelsMatchUser(userId, agent.id);

    if (skillCmd.def.skillSlug === "token-quality-report") {
      const result = await runQualityReportWithAgent(
        userId,
        agent.id,
        String(skillCmd.input.mint),
        {
          maxPairAgeHours:
            typeof skillCmd.input.maxPairAgeHours === "number"
              ? skillCmd.input.maxPairAgeHours
              : undefined,
          trigger: runSource,
        }
      );
      if (result.message) {
        return { handled: true, content: formatReply(result.message, telegram) };
      }
      return { handled: true, content: "Command completed." };
    }

    let result;
    if (skillCmd.def.skillSlug === "token-quick-lookup") {
      result = await runTokenLookupFast(userId, agent.id, String(skillCmd.input.query), runSource);
    } else {
      result = await runSkillFast(
        userId,
        agent.id,
        skillCmd.def.skillSlug,
        skillCmd.input,
        "Command failed.",
        runSource
      );
    }

    if (result.message) {
      return { handled: true, content: formatReply(result.message, telegram) };
    }
    return { handled: true, content: "Command completed." };
  }

  if (cmdIs(trimmed, "status")) {
    await ensureAgentModelsMatchUser(userId, agentId);

    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return {
        handled: true,
        content: "No active agent found. Create one in the dashboard first.",
      };
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        defaultModel: true,
        defaultImageModel: true,
        fallbackModels: true,
        email: true,
      },
    });
    const chatModel = resolveChatModel(agent.model, dbUser?.defaultModel);
    const imageModel = resolveImageModel(agent.imageModel, dbUser?.defaultImageModel);
    const fallbacks =
      dbUser?.fallbackModels?.length && dbUser.fallbackModels.length > 0
        ? dbUser.fallbackModels.join(", ")
        : null;
    const account = dbUser?.email ? dbUser.email.replace(/(.{2}).*(@.*)/, "$1…$2") : null;
    const content = telegram
      ? `*${agent.name}*\nChat: \`${chatModel}\`\nImage: \`${imageModel}\`${
          fallbacks ? `\nFallbacks: \`${fallbacks}\`` : ""
        }\nID: \`${agent.id.slice(0, 8)}…\`${account ? `\nAccount: \`${account}\`` : ""}\n\n_From Dashboard → Settings_`
      : `${agent.name}\nChat: ${chatModel}\nImage: ${imageModel}${
          fallbacks ? `\nFallbacks: ${fallbacks}` : ""
        }\nID: ${agent.id.slice(0, 8)}…${account ? `\nAccount: ${account}` : ""}\n\nFrom Dashboard → Settings`;
    return { handled: true, content };
  }

  if (cmdIs(trimmed, "tasks")) {
    const agent = await resolveAgentRecord(userId, agentId);
    if (!agent) {
      return {
        handled: true,
        content: "No active agent. Create one in the dashboard first.",
      };
    }
    const tasks = await listBrainTasks(userId, {
      agentId: agent.id,
      status: "PENDING",
      limit: 15,
      order: "asc",
    });
    if (tasks.length === 0) {
      return {
        handled: true,
        content: formatReply("No pending brain tasks. Ask the agent to schedule tweets, reminders, or a content calendar.", telegram),
      };
    }
    const lines = telegram ? ["*Pending brain tasks:*", ""] : ["Pending brain tasks:", ""];
    tasks.forEach((t, i) => {
      const when = t.scheduledAt.toISOString().replace("T", " ").slice(0, 16);
      lines.push(`${i + 1}. [${t.type}] ${t.title} — ${when} UTC`);
      lines.push(`   id: \`${t.id.slice(0, 8)}…\``);
    });
    return { handled: true, content: formatReply(lines.join("\n"), telegram) };
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

    await syncUserChatModel(userId, match.value);
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
    await syncUserChatModel(userId, modelId);
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

    await syncUserImageModel(userId, match.value);
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
    await syncUserImageModel(userId, modelId);
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

    await ensureAgentModelsMatchUser(userId, agent.id);
    const result = await generateImageForAgent(userId, agent.id, prompt, runSource);
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
      await updateChatSession(userId, chatSessionId, { agentId: match.id });
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
      content: await formatInactiveAgentReply(userId, telegram),
    };
  }

  await ensureAgentModelsMatchUser(userId, agent.id);

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
