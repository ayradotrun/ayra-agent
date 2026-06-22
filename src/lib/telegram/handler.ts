import path from "path";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agent/runtime";
import { getSkill } from "@/lib/skills";
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_IMAGE_MODEL,
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
import {
  getBotTokenFromUser,
  sendTelegramMessage,
  sendTelegramPhoto,
  type TelegramUpdate,
} from "./client";
import { tryTelegramFastPath } from "./fast-path";
import { TELEGRAM_HELP_TEXT } from "./commands";
import { parseSkillCommand, formatSkillCommandsHelp } from "./skill-commands";
import { runSkillFast, runTokenLookupFast } from "./skill-runner";
import { claimTelegramUpdate } from "./dedup";

function imageUrlToLocalPath(url: string): string | null {
  const match = url.match(/^\/api\/generated\/([^/?#]+)$/);
  if (!match) return null;
  return path.join(process.cwd(), "storage", "generated", match[1]);
}

async function sendRunImages(
  botToken: string,
  chatId: string,
  imagePaths: string[],
  caption?: string
): Promise<void> {
  for (let i = 0; i < imagePaths.length; i++) {
    const filePath = imagePaths[i];
    await sendTelegramPhoto(
      botToken,
      chatId,
      filePath,
      i === 0 ? caption : undefined
    );
  }
}

async function generateImageViaTelegram(
  userId: string,
  agentId: string,
  prompt: string
): Promise<{ ok: boolean; message: string; imagePaths?: string[] }> {
  const skill = getSkill("image-generator");
  if (!skill) {
    return { ok: false, message: "Image generator skill is not available." };
  }

  const run = await prisma.agentRun.create({
    data: { agentId, status: "RUNNING" },
  });

  const logFn = async (
    level: "DEBUG" | "INFO" | "WARN" | "ERROR",
    message: string,
    toolUsed?: string
  ) => {
    await prisma.agentLog.create({
      data: { agentId, runId: run.id, level, message, toolUsed },
    });
  };

  try {
    const result = (await skill.execute(
      { prompt },
      { agentId, userId, runId: run.id, log: logFn }
    )) as {
      ok?: boolean;
      error?: string;
      imageUrls?: string[];
      model?: string;
      description?: string;
    };

    const imagePaths =
      result.imageUrls
        ?.map((u) => imageUrlToLocalPath(u))
        .filter((p): p is string => p !== null) ?? [];

    const status = result.ok ? "COMPLETED" : "FAILED";
    const summary =
      result.ok && imagePaths.length > 0
        ? `Generated ${imagePaths.length} image(s) with ${result.model}`
        : result.error || "Image generation failed";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: new Date(),
        output: summary,
        summary,
        error: result.ok ? null : result.error || summary,
      },
    });

    if (!result.ok || imagePaths.length === 0) {
      return { ok: false, message: result.error || "No image was generated." };
    }

    const desc = result.description ? `\n${result.description}` : "";
    return {
      ok: true,
      message: `🖼 Generated with *${getModelLabel(result.model || DEFAULT_IMAGE_MODEL)}*${desc}`,
      imagePaths,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: message,
        summary: message,
      },
    });
    return { ok: false, message };
  }
}

export async function handleTelegramUpdate(
  userId: string,
  update: TelegramUpdate
): Promise<void> {
  const message = update.message;
  if (!message?.text) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.telegramChatEnabled) return;

  const botToken = getBotTokenFromUser(user);
  if (!botToken) return;

  const chatId = String(message.chat.id);

  // Only accept messages from configured chat (security)
  if (user.telegramChatId && user.telegramChatId !== chatId) {
    await sendTelegramMessage(
      botToken,
      chatId,
      "⚠️ This chat is not linked to your AYRA account. Set your Chat ID in Dashboard → Settings."
    );
    return;
  }

  // Auto-link chat ID on first message if empty
  if (!user.telegramChatId) {
    await prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: chatId },
    });
  }

  const text = message.text.trim();

  if (text === "/start" || text === "/help") {
    await sendTelegramMessage(botToken, chatId, TELEGRAM_HELP_TEXT);
    return;
  }

  if (text === "/skills") {
    await sendTelegramMessage(botToken, chatId, formatSkillCommandsHelp());
    return;
  }

  const skillCmd = parseSkillCommand(text);
  if (skillCmd) {
    if ("error" in skillCmd) {
      await sendTelegramMessage(botToken, chatId, skillCmd.error);
      return;
    }

    const agent = await resolveTelegramDefaultAgent(userId, user.telegramDefaultAgentId);
    if (!agent) {
      await sendTelegramMessage(botToken, chatId, "No active agent. Create one in the dashboard first.");
      return;
    }

    await ensureAgentModelsMatchUser(userId, agent.id, user.telegramDefaultAgentId);

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
      await sendTelegramMessage(botToken, chatId, result.message);
    }
    return;
  }

  if (text === "/status") {
    const agent = await resolveTelegramDefaultAgent(userId, user.telegramDefaultAgentId);
    if (!agent) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "No active agent found. Create one in the dashboard first."
      );
      return;
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultModel: true, defaultImageModel: true },
    });
    const chatModel = resolveChatModel(agent.model, dbUser?.defaultModel);
    const imageModel = resolveImageModel(agent.imageModel, dbUser?.defaultImageModel);
    await sendTelegramMessage(
      botToken,
      chatId,
      `*${agent.name}*\nChat: \`${chatModel}\`\nImage: \`${imageModel}\`\nID: \`${agent.id.slice(0, 8)}…\`\n\n_Synced with Dashboard → Settings_`
    );
    return;
  }

  if (text === "/models" || text === "/models chat" || text === "/models image") {
    const options =
      text === "/models chat"
        ? CHAT_MODEL_OPTIONS
        : text === "/models image"
          ? IMAGE_MODEL_OPTIONS
          : [...CHAT_MODEL_OPTIONS, ...IMAGE_MODEL_OPTIONS];
    await sendTelegramMessage(botToken, chatId, formatTelegramModelList(options));
    return;
  }

  if (text === "/model" || text.startsWith("/model ")) {
    const agent = await resolveTelegramDefaultAgent(userId, user.telegramDefaultAgentId);
    if (!agent) {
      await sendTelegramMessage(botToken, chatId, "No active agent. Create one in the dashboard first.");
      return;
    }

    const query = text.slice(6).trim();
    if (!query) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { defaultModel: true },
      });
      const chatModel = resolveChatModel(agent.model, dbUser?.defaultModel);
      await sendTelegramMessage(
        botToken,
        chatId,
        `Chat model: *${getModelLabel(chatModel)}*\n\`${chatModel}\`\n\nChange: \`/model [name]\` or Dashboard → Settings`
      );
      return;
    }

    const match = resolveModelQuery(query, CHAT_MODEL_OPTIONS);
    if (!match) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "Model not found. Use `/models chat` to see options."
      );
      return;
    }

    await syncUserChatModel(userId, match.value, user.telegramDefaultAgentId);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Chat model → *${match.label}*\n\`${match.value}\`\n_Synced to Dashboard Settings_`
    );
    return;
  }

  if (text === "/custommodel" || text.startsWith("/custommodel ")) {
    const agent = await resolveTelegramDefaultAgent(userId, user.telegramDefaultAgentId);
    if (!agent) {
      await sendTelegramMessage(botToken, chatId, "No active agent. Create one in the dashboard first.");
      return;
    }

    const query = text.slice(12).trim();
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultModel: true },
    });
    const chatModel = resolveChatModel(agent.model, dbUser?.defaultModel);

    if (!query) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `Custom chat model: \`${chatModel}\`\n\nSet: \`/custommodel [provider/model-id]\``
      );
      return;
    }

    if (!isValidModelId(query)) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "Invalid model ID. Use OpenRouter format: `provider/model-id`"
      );
      return;
    }

    const modelId = normalizeModelId(query);
    await syncUserChatModel(userId, modelId, user.telegramDefaultAgentId);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Custom chat model → \`${modelId}\`\n_Synced to Dashboard Settings_`
    );
    return;
  }

  if (text === "/imagemodel" || text.startsWith("/imagemodel ")) {
    const agent = await resolveTelegramDefaultAgent(userId, user.telegramDefaultAgentId);
    if (!agent) {
      await sendTelegramMessage(botToken, chatId, "No active agent. Create one in the dashboard first.");
      return;
    }

    const query = text.slice(11).trim();
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultImageModel: true },
    });
    const current = resolveImageModel(agent.imageModel, dbUser?.defaultImageModel);

    if (!query) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `Image model: *${getModelLabel(current)}*\n\`${current}\`\n\nChange: \`/imagemodel [name]\` or Dashboard → Settings`
      );
      return;
    }

    const match = resolveModelQuery(query, IMAGE_MODEL_OPTIONS);
    if (!match) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "Image model not found. Use `/models image` to see options."
      );
      return;
    }

    await syncUserImageModel(userId, match.value, user.telegramDefaultAgentId);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Image model → *${match.label}*\n\`${match.value}\`\n_Synced to Dashboard Settings_`
    );
    return;
  }

  if (text === "/customimagemodel" || text.startsWith("/customimagemodel ")) {
    const agent = await resolveTelegramDefaultAgent(userId, user.telegramDefaultAgentId);
    if (!agent) {
      await sendTelegramMessage(botToken, chatId, "No active agent. Create one in the dashboard first.");
      return;
    }

    const query = text.slice(17).trim();
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { defaultImageModel: true },
    });
    const current = resolveImageModel(agent.imageModel, dbUser?.defaultImageModel);

    if (!query) {
      await sendTelegramMessage(
        botToken,
        chatId,
        `Custom image model: \`${current}\`\n\nSet: \`/customimagemodel [provider/model-id]\``
      );
      return;
    }

    if (!isValidModelId(query)) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "Invalid model ID. Use OpenRouter format: `provider/model-id`"
      );
      return;
    }

    const modelId = normalizeModelId(query);
    await syncUserImageModel(userId, modelId, user.telegramDefaultAgentId);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Custom image model → \`${modelId}\`\n_Synced to Dashboard Settings_`
    );
    return;
  }

  if (text.startsWith("/image ")) {
    const prompt = text.slice(7).trim();
    if (!prompt) {
      await sendTelegramMessage(botToken, chatId, "Usage: `/image [prompt]`");
      return;
    }

    const agent = await resolveTelegramDefaultAgent(userId, user.telegramDefaultAgentId);
    if (!agent) {
      await sendTelegramMessage(botToken, chatId, "No active agent. Create one in the dashboard first.");
      return;
    }

    await sendTelegramMessage(botToken, chatId, "🎨 Generating image…");
    await ensureAgentModelsMatchUser(userId, agent.id, user.telegramDefaultAgentId);
    const result = await generateImageViaTelegram(userId, agent.id, prompt);
    if (!result.ok || !result.imagePaths?.length) {
      await sendTelegramMessage(botToken, chatId, `❌ ${result.message}`);
      return;
    }

    await sendRunImages(botToken, chatId, result.imagePaths, result.message);
    return;
  }

  if (text === "/agents") {
    const agents = await prisma.agent.findMany({
      where: { userId },
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    if (agents.length === 0) {
      await sendTelegramMessage(botToken, chatId, "No agents yet. Create one at your AYRA dashboard.");
      return;
    }
    const list = agents
      .map((a) => `• *${a.name}* (${a.status}) — \`${a.id.slice(0, 8)}…\``)
      .join("\n");
    await sendTelegramMessage(
      botToken,
      chatId,
      `*Your agents:*\n${list}\n\nSet default: /use Agent Name`
    );
    return;
  }

  if (text.startsWith("/use ")) {
    const nameQuery = text.slice(5).trim().toLowerCase();
    const agents = await prisma.agent.findMany({ where: { userId } });
    const match =
      agents.find((a) => a.id.startsWith(nameQuery)) ||
      agents.find((a) => a.name.toLowerCase().includes(nameQuery));

    if (!match) {
      await sendTelegramMessage(botToken, chatId, "Agent not found. Use /agents to see the list.");
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { telegramDefaultAgentId: match.id },
    });
    await sendTelegramMessage(botToken, chatId, `✅ Default agent set to *${match.name}*`);
    return;
  }

  const agent = await resolveTelegramDefaultAgent(userId, user.telegramDefaultAgentId);
  if (!agent) {
    await sendTelegramMessage(
      botToken,
      chatId,
      "No active agent. Create one in the dashboard, then try again."
    );
    return;
  }

  await ensureAgentModelsMatchUser(userId, agent.id, user.telegramDefaultAgentId);

  const fast = await tryTelegramFastPath(userId, agent.id, text);
  if (fast.handled && fast.message) {
    await sendTelegramMessage(botToken, chatId, fast.message);
    if (fast.imagePaths?.length) {
      await sendRunImages(botToken, chatId, fast.imagePaths);
    }
    return;
  }

  await sendTelegramMessage(botToken, chatId, `⏳ Running *${agent.name}*…`);

  try {
    const result = await runAgent(agent.id, {
      trigger: "telegram",
      userMessage: text,
      replyViaTelegram: true,
    });

    const reply =
      result.output?.slice(0, 3500) ||
      result.summary?.slice(0, 3500) ||
      (result.error ? `❌ ${result.error}` : "Run completed with no output.");

    const isAyraFormatted =
      reply.includes("Meme scan") ||
      reply.includes("AYRA Scan") ||
      reply.includes("AYRA Quality") ||
      reply.includes("🍃");

    if (isAyraFormatted) {
      await sendTelegramMessage(botToken, chatId, reply);
    } else {
      const prefix =
        result.status === "COMPLETED" ? "✅" : result.status === "TIMEOUT" ? "⏱️" : "❌";
      await sendTelegramMessage(botToken, chatId, `${prefix} *${agent.name}*\n\n${reply}`);
    }

    if (result.imagePaths && result.imagePaths.length > 0) {
      await sendRunImages(botToken, chatId, result.imagePaths);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Run failed";
    await sendTelegramMessage(botToken, chatId, `❌ Error: ${msg}`);
  }
}

export async function handleTelegramUpdateBySecret(
  webhookSecret: string,
  update: TelegramUpdate
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { telegramWebhookSecret: webhookSecret },
  });
  if (!user) return;

  const botToken = getBotTokenFromUser(user);
  if (!botToken) return;

  const claimed = await claimTelegramUpdate(botToken, update.update_id);
  if (!claimed) return;

  await handleTelegramUpdate(user.id, update);
}
