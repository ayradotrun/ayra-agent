import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { encryptSafe, decryptSafe } from "@/lib/encryption";
import {
  generateWebhookSecret,
  registerTelegramWebhook,
  setTelegramBotCommands,
} from "@/lib/telegram/client";
import { getXConnectionInfo, getXCallbackUrl, isXOAuthConfigured } from "@/lib/x-oauth";
import { isValidModelId, normalizeModelId, normalizeChatModel } from "@/lib/models";
import { isValidLlmBaseUrl, resolveLlmBaseUrl, normalizeLlmBaseUrl } from "@/lib/llm-config";
import { syncUserChatModel, syncUserImageModel } from "@/lib/user-models";
import { z } from "zod";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      defaultModel: true,
      defaultImageModel: true,
      llmBaseUrl: true,
      emailNotifications: true,
      telegramNotifications: true,
      telegramChatEnabled: true,
      memeAlertsEnabled: true,
      telegramChatId: true,
      telegramDefaultAgentId: true,
      telegramWebhookSecret: true,
      openRouterApiKey: true,
      telegramBotToken: true,
      xApiKey: true,
      xApiSecret: true,
      xAccessToken: true,
      xAccessSecret: true,
      xAutoPostEnabled: true,
      solanaDefaultRpc: true,
      solanaRpcApiKey: true,
    },
  });

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, status: true },
    orderBy: { updatedAt: "desc" },
  });

  const baseUrl = process.env.TELEGRAM_WEBHOOK_URL || process.env.NEXTAUTH_URL || "";
  const webhookUrl =
    dbUser?.telegramWebhookSecret && !baseUrl.includes("localhost")
      ? `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook/${dbUser.telegramWebhookSecret}`
      : null;

  const xConnection = await getXConnectionInfo(user.id);
  const xOAuthConfigured = isXOAuthConfigured();

  return NextResponse.json({
    ...dbUser,
    agents,
    webhookUrl,
    telegramPollingMode: baseUrl.includes("localhost") || process.env.TELEGRAM_POLLING === "true",
    xConnection,
    xOAuthConfigured,
    xOAuthCallbackUrl: getXCallbackUrl(),
    hasOpenRouterKey: !!dbUser?.openRouterApiKey,
    hasLlmApiKey: !!dbUser?.openRouterApiKey,
    llmBaseUrl: dbUser?.llmBaseUrl,
    effectiveLlmBaseUrl: resolveLlmBaseUrl(dbUser?.llmBaseUrl),
    hasTelegramToken: !!(dbUser?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN),
    hasXCredentials: xConnection.connected,
    hasXApiKey: !!dbUser?.xApiKey,
    hasXApiSecret: !!dbUser?.xApiSecret,
    hasXAccessToken: !!dbUser?.xAccessToken,
    hasXAccessSecret: !!dbUser?.xAccessSecret,
    hasSolanaRpcApiKey: !!dbUser?.solanaRpcApiKey || !!process.env.SOLANA_RPC_API_KEY,
    openRouterApiKey: undefined,
    telegramBotToken: undefined,
    xApiKey: undefined,
    xApiSecret: undefined,
    xAccessToken: undefined,
    xAccessSecret: undefined,
    telegramWebhookSecret: undefined,
  });
}

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).nullish(),
  defaultModel: z
    .string()
    .nullish()
    .transform((v) => (v?.trim() ? normalizeModelId(v) : undefined))
    .refine((v) => !v || isValidModelId(v), {
      message: "Invalid model ID",
    }),
  defaultImageModel: z
    .string()
    .nullish()
    .transform((v) => (v?.trim() ? normalizeModelId(v) : undefined))
    .refine((v) => !v || isValidModelId(v), {
      message: "Invalid image model ID",
    }),
  llmBaseUrl: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === null) return null;
      const trimmed = v.trim();
      return trimmed ? trimmed : null;
    })
    .refine((v) => v === undefined || v === null || isValidLlmBaseUrl(v), {
      message: "Invalid LLM base URL (use https://host/api/v1 format)",
    }),
  llmApiKey: z.string().optional(),
  openRouterApiKey: z.string().optional(),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  telegramChatEnabled: z.boolean().optional(),
  telegramDefaultAgentId: z.string().nullable().optional(),
  emailNotifications: z.boolean().optional(),
  telegramNotifications: z.boolean().optional(),
  memeAlertsEnabled: z.boolean().optional(),
  xApiKey: z.string().optional(),
  xApiSecret: z.string().optional(),
  xAccessToken: z.string().optional(),
  xAccessSecret: z.string().optional(),
  xAutoPostEnabled: z.boolean().optional(),
  solanaDefaultRpc: z.string().optional(),
  solanaRpcApiKey: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({ where: { id: user.id } });
    const updateData: Record<string, unknown> = {};

    if (data.name) updateData.name = data.name;
    if (data.telegramChatId !== undefined) updateData.telegramChatId = data.telegramChatId;
    if (data.telegramChatEnabled !== undefined) updateData.telegramChatEnabled = data.telegramChatEnabled;
    if (data.telegramDefaultAgentId !== undefined) {
      updateData.telegramDefaultAgentId = data.telegramDefaultAgentId;
    }
    if (data.emailNotifications !== undefined) updateData.emailNotifications = data.emailNotifications;
    if (data.telegramNotifications !== undefined) updateData.telegramNotifications = data.telegramNotifications;
    if (data.memeAlertsEnabled !== undefined) updateData.memeAlertsEnabled = data.memeAlertsEnabled;
    if (data.xAutoPostEnabled !== undefined) updateData.xAutoPostEnabled = data.xAutoPostEnabled;
    if (data.solanaDefaultRpc !== undefined) updateData.solanaDefaultRpc = data.solanaDefaultRpc || null;
    if (data.solanaRpcApiKey) updateData.solanaRpcApiKey = encryptSafe(data.solanaRpcApiKey);

    if (data.llmBaseUrl !== undefined) {
      updateData.llmBaseUrl = data.llmBaseUrl ? normalizeLlmBaseUrl(data.llmBaseUrl) : null;
    }

    const llmApiKey = data.llmApiKey || data.openRouterApiKey;
    if (llmApiKey) updateData.openRouterApiKey = encryptSafe(llmApiKey);
    if (data.telegramBotToken) updateData.telegramBotToken = encryptSafe(data.telegramBotToken);
    if (data.xApiKey) updateData.xApiKey = encryptSafe(data.xApiKey);
    if (data.xApiSecret) updateData.xApiSecret = encryptSafe(data.xApiSecret);
    if (data.xAccessToken) {
      updateData.xAccessToken = encryptSafe(data.xAccessToken);
      updateData.xAuthMethod = "oauth1";
    }
    if (data.xAccessSecret) updateData.xAccessSecret = encryptSafe(data.xAccessSecret);

    let webhookSecret = existing?.telegramWebhookSecret;
    if ((data.telegramBotToken || existing?.telegramBotToken) && !webhookSecret) {
      webhookSecret = generateWebhookSecret();
      updateData.telegramWebhookSecret = webhookSecret;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        defaultModel: true,
        defaultImageModel: true,
        llmBaseUrl: true,
        emailNotifications: true,
        telegramNotifications: true,
        memeAlertsEnabled: true,
        telegramChatEnabled: true,
        telegramChatId: true,
        telegramDefaultAgentId: true,
        telegramWebhookSecret: true,
        xAutoPostEnabled: true,
        solanaDefaultRpc: true,
        solanaRpcApiKey: true,
        openRouterApiKey: true,
        telegramBotToken: true,
        xApiKey: true,
        xApiSecret: true,
        xAccessToken: true,
        xAccessSecret: true,
      },
    });

    if (data.defaultModel) {
      await syncUserChatModel(user.id, normalizeChatModel(data.defaultModel), updated.telegramDefaultAgentId);
    }
    if (data.defaultImageModel) {
      await syncUserImageModel(user.id, data.defaultImageModel, updated.telegramDefaultAgentId);
    }

    if (data.telegramDefaultAgentId !== undefined && !data.defaultModel && !data.defaultImageModel) {
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: { defaultModel: true, defaultImageModel: true },
      });
      if (u?.defaultModel) {
        await syncUserChatModel(user.id, u.defaultModel, updated.telegramDefaultAgentId);
      }
      if (u?.defaultImageModel) {
        await syncUserImageModel(user.id, u.defaultImageModel, updated.telegramDefaultAgentId);
      }
    }

    const refreshedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { defaultModel: true, defaultImageModel: true },
    });

    const botToken = data.telegramBotToken
      ? data.telegramBotToken
      : updated.telegramBotToken
        ? decryptSafe(updated.telegramBotToken)
        : null;

    let webhookStatus: string | undefined;
    if (botToken && updated.telegramWebhookSecret) {
      const result = await registerTelegramWebhook(botToken, updated.telegramWebhookSecret);
      webhookStatus = result.ok ? "registered" : result.description;
    }

    if (botToken) {
      await setTelegramBotCommands(botToken);
    }

    const baseUrl = process.env.TELEGRAM_WEBHOOK_URL || process.env.NEXTAUTH_URL || "";
    const xConnection = await getXConnectionInfo(user.id);

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      defaultModel: refreshedUser?.defaultModel ?? updated.defaultModel,
      defaultImageModel: refreshedUser?.defaultImageModel ?? updated.defaultImageModel,
      llmBaseUrl: updated.llmBaseUrl,
      effectiveLlmBaseUrl: resolveLlmBaseUrl(updated.llmBaseUrl),
      emailNotifications: updated.emailNotifications,
      telegramNotifications: updated.telegramNotifications,
      memeAlertsEnabled: updated.memeAlertsEnabled,
      telegramChatEnabled: updated.telegramChatEnabled,
      telegramChatId: updated.telegramChatId,
      telegramDefaultAgentId: updated.telegramDefaultAgentId,
      xAutoPostEnabled: updated.xAutoPostEnabled,
      solanaDefaultRpc: updated.solanaDefaultRpc,
      webhookStatus,
      telegramPollingMode: baseUrl.includes("localhost") || process.env.TELEGRAM_POLLING === "true",
      hasOpenRouterKey: !!updated.openRouterApiKey,
      hasLlmApiKey: !!updated.openRouterApiKey,
      hasTelegramToken: !!(updated.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN),
      hasXCredentials: xConnection.connected,
      hasXApiKey: !!updated.xApiKey,
      hasXApiSecret: !!updated.xApiSecret,
      hasXAccessToken: !!updated.xAccessToken,
      hasXAccessSecret: !!updated.xAccessSecret,
      hasSolanaRpcApiKey: !!updated.solanaRpcApiKey || !!process.env.SOLANA_RPC_API_KEY,
      xConnection,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  await prisma.user.delete({ where: { id: user.id } });
  return NextResponse.json({ success: true });
}
