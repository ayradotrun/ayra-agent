import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth-helpers";
import { decryptSafe } from "@/lib/encryption";
import {
  generateWebhookSecret,
  registerTelegramWebhook,
  setTelegramBotCommands,
} from "@/lib/telegram/client";
import { getXConnectionInfo, getXCallbackUrl, isXOAuthConfigured, verifyXCredentialsForUser } from "@/lib/x-oauth";
import { isValidModelId, normalizeModelId, normalizeChatModel } from "@/lib/models";
import { isValidLlmBaseUrl, resolveLlmBaseUrl, normalizeLlmBaseUrl } from "@/lib/llm-config";
import { syncUserChatModel, syncUserImageModel } from "@/lib/user-models";
import { claimTelegramChatForUser, dedupeTelegramChatIds } from "@/lib/telegram/bots-config";
import { connectUserPrivateDatabase } from "@/lib/brain/connect-private-database";
import { allowPlatformBrainDatabase } from "@/lib/brain/brain-db-url";
import { DEFAULT_SOLANA_RPC } from "@/lib/solana";
import { listSecretFlags, upsertEncryptedSecret } from "@/lib/secrets/secret-store";
import { detectLlmProviderId } from "@/lib/llm-providers";
import { z } from "zod";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorizedResponse();

  try {
    await dedupeTelegramChatIds();
    const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      defaultModel: true,
      defaultImageModel: true,
      llmBaseUrl: true,
      llmProviderId: true,
      emailNotifications: true,
      telegramNotifications: true,
      telegramChatEnabled: true,
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
      fallbackRpcUrls: true,
      brainDatabaseUrl: true,
      fallbackModels: true,
      fallbackImageModels: true,
      agentMemoryEnabled: true,
      agentMemoryUrl: true,
    },
  });

  if (dbUser?.telegramChatId) {
    await claimTelegramChatForUser(user.id, dbUser.telegramChatId);
  }

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

  const customModels = await prisma.customModel.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      modelName: true,
      modelId: true,
      modelType: true,
    },
  });

  const secretFlags = await listSecretFlags(user.id);
  const providerId =
    (dbUser?.llmProviderId && dbUser.llmProviderId.trim()) ||
    detectLlmProviderId(dbUser?.llmBaseUrl) ||
    "openrouter";

  return NextResponse.json({
    ...dbUser,
    llmProviderId: providerId,
    customModels,
    agents,
    webhookUrl,
    telegramPollingMode: baseUrl.includes("localhost") || process.env.TELEGRAM_POLLING === "true",
    xConnection,
    xOAuthConfigured,
    xOAuthCallbackUrl: getXCallbackUrl(),
    hasOpenRouterKey: secretFlags.hasLlmApiKey,
    hasLlmApiKey: secretFlags.hasLlmApiKey,
    llmBaseUrl: dbUser?.llmBaseUrl,
    effectiveLlmBaseUrl: resolveLlmBaseUrl(dbUser?.llmBaseUrl),
    hasTelegramToken: secretFlags.hasTelegramToken || !!process.env.TELEGRAM_BOT_TOKEN,
    hasXCredentials: xConnection.connected,
    hasXApiKey: secretFlags.hasXApiKey,
    hasXApiSecret: secretFlags.hasXApiSecret,
    hasXAccessToken: secretFlags.hasXAccessToken,
    hasXAccessSecret: secretFlags.hasXAccessSecret,
    hasSolanaRpcApiKey: secretFlags.hasSolanaRpcApiKey || !!process.env.SOLANA_RPC_API_KEY,
    hasJinaApiKey: secretFlags.hasJinaApiKey,
    hasBrainDatabaseUrl: !!dbUser?.brainDatabaseUrl,
    effectiveSolanaDefaultRpc: dbUser?.solanaDefaultRpc?.trim() || DEFAULT_SOLANA_RPC,
    fallbackRpcUrls: dbUser?.fallbackRpcUrls ?? [],
    brainDatabaseUrl: dbUser?.brainDatabaseUrl
      ? decryptSafe(dbUser.brainDatabaseUrl)
      : null,
    fallbackModels: dbUser?.fallbackModels ?? [],
    fallbackImageModels: dbUser?.fallbackImageModels ?? [],
    agentMemoryEnabled: dbUser?.agentMemoryEnabled ?? false,
    agentMemoryUrl: dbUser?.agentMemoryUrl ?? null,
    allowPlatformBrainDb: allowPlatformBrainDatabase(),
    openRouterApiKey: undefined,
    telegramBotToken: undefined,
    xApiKey: undefined,
    xApiSecret: undefined,
    xAccessToken: undefined,
    xAccessSecret: undefined,
    telegramWebhookSecret: undefined,
  });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    console.error("[Settings GET]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
  llmProviderId: z.string().optional(),
  llmApiKey: z.string().optional(),
  openRouterApiKey: z.string().optional(),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  telegramChatEnabled: z.boolean().optional(),
  telegramDefaultAgentId: z.string().nullable().optional(),
  emailNotifications: z.boolean().optional(),
  telegramNotifications: z.boolean().optional(),
  xApiKey: z.string().optional(),
  xApiSecret: z.string().optional(),
  xAccessToken: z.string().optional(),
  xAccessSecret: z.string().optional(),
  xAutoPostEnabled: z.boolean().optional(),
  solanaDefaultRpc: z.string().optional(),
  solanaRpcApiKey: z.string().optional(),
  fallbackRpcUrls: z.array(z.string()).optional(),
  brainDatabaseUrl: z.union([z.string(), z.null()]).optional(),
  fallbackModels: z.array(z.string()).optional(),
  fallbackImageModels: z.array(z.string()).optional(),
  agentMemoryEnabled: z.boolean().optional(),
  agentMemoryUrl: z.union([z.string(), z.null()]).optional(),
  jinaApiKey: z.string().optional(),
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
    if (data.xAutoPostEnabled !== undefined) updateData.xAutoPostEnabled = data.xAutoPostEnabled;
    if (data.solanaDefaultRpc !== undefined) {
      const trimmed = data.solanaDefaultRpc.trim();
      updateData.solanaDefaultRpc =
        trimmed && trimmed !== DEFAULT_SOLANA_RPC ? trimmed : null;
    }
    if (data.solanaRpcApiKey?.trim()) {
      await upsertEncryptedSecret(user.id, "solana", "rpc_api_key", data.solanaRpcApiKey.trim());
    }
    if (data.jinaApiKey?.trim()) {
      await upsertEncryptedSecret(user.id, "jina", "api_key", data.jinaApiKey.trim());
    }
    if (data.fallbackRpcUrls !== undefined) {
      const urls: string[] = [];
      for (const raw of data.fallbackRpcUrls) {
        const url = raw.trim();
        if (!url) continue;
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
          if (!urls.includes(url)) urls.push(url);
        } catch {
          /* skip invalid */
        }
      }
      updateData.fallbackRpcUrls = urls;
    }
    if (data.fallbackModels !== undefined) {
      updateData.fallbackModels = data.fallbackModels
        .map((m) => m.trim())
        .filter((m) => m.length > 0 && isValidModelId(m));
    }
    if (data.fallbackImageModels !== undefined) {
      updateData.fallbackImageModels = data.fallbackImageModels
        .map((m) => m.trim())
        .filter((m) => m.length > 0 && isValidModelId(m));
    }
    if (data.agentMemoryEnabled !== undefined) {
      updateData.agentMemoryEnabled = data.agentMemoryEnabled;
    }
    if (data.agentMemoryUrl !== undefined) {
      updateData.agentMemoryUrl = data.agentMemoryUrl?.trim() || null;
    }

    if (data.brainDatabaseUrl !== undefined) {
      const trimmed =
        data.brainDatabaseUrl === null ? "" : data.brainDatabaseUrl.trim();

      if (!trimmed) {
        return NextResponse.json(
          { error: "Private database URL is required and cannot be removed." },
          { status: 400 }
        );
      }

      try {
        await connectUserPrivateDatabase(user.id, trimmed);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Connection failed";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (data.llmBaseUrl !== undefined) {
      updateData.llmBaseUrl = data.llmBaseUrl ? normalizeLlmBaseUrl(data.llmBaseUrl) : null;
    }
    if (data.llmProviderId !== undefined) {
      updateData.llmProviderId = data.llmProviderId.trim() || "openrouter";
    }

    const llmApiKey = data.llmApiKey || data.openRouterApiKey;
    if (llmApiKey?.trim()) {
      await upsertEncryptedSecret(user.id, "llm", "api_key", llmApiKey.trim());
    }
    if (data.telegramBotToken?.trim()) {
      await upsertEncryptedSecret(user.id, "telegram", "bot_token", data.telegramBotToken.trim());
    }
    if (data.xApiKey?.trim()) {
      await upsertEncryptedSecret(user.id, "x", "api_key", data.xApiKey.trim());
    }
    if (data.xApiSecret?.trim()) {
      await upsertEncryptedSecret(user.id, "x", "api_secret", data.xApiSecret.trim());
    }
    if (data.xAccessToken?.trim()) {
      await upsertEncryptedSecret(user.id, "x", "access_token", data.xAccessToken.trim());
      updateData.xAuthMethod = "oauth1";
    }
    if (data.xAccessSecret?.trim()) {
      await upsertEncryptedSecret(user.id, "x", "access_secret", data.xAccessSecret.trim());
    }

    const xCredentialsTouched = !!(
      data.xApiKey ||
      data.xApiSecret ||
      data.xAccessToken ||
      data.xAccessSecret
    );

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
        llmProviderId: true,
        emailNotifications: true,
        telegramNotifications: true,
        telegramChatEnabled: true,
        telegramChatId: true,
        telegramDefaultAgentId: true,
        telegramWebhookSecret: true,
        xAutoPostEnabled: true,
        solanaDefaultRpc: true,
        solanaRpcApiKey: true,
        fallbackRpcUrls: true,
        brainDatabaseUrl: true,
        fallbackModels: true,
        fallbackImageModels: true,
        agentMemoryEnabled: true,
        agentMemoryUrl: true,
        openRouterApiKey: true,
        telegramBotToken: true,
        xApiKey: true,
        xApiSecret: true,
        xAccessToken: true,
        xAccessSecret: true,
      },
    });

    if (updated.telegramChatId) {
      await claimTelegramChatForUser(user.id, updated.telegramChatId);
    }

    if (xCredentialsTouched) {
      const verified = await verifyXCredentialsForUser(user.id);
      if (!verified.ok) {
        return NextResponse.json(
          { error: verified.error ?? "X credentials could not be verified." },
          { status: 400 }
        );
      }
      await prisma.user.update({
        where: { id: user.id },
        data: {
          xAuthMethod: "oauth1",
          xUsername: verified.username,
          xUserId: verified.xUserId,
          xConnectedAt: new Date(),
        },
      });
    }

    if (data.defaultModel) {
      await syncUserChatModel(user.id, normalizeChatModel(data.defaultModel));
    }
    if (data.defaultImageModel) {
      await syncUserImageModel(user.id, data.defaultImageModel);
    }

    if (data.telegramDefaultAgentId !== undefined && !data.defaultModel && !data.defaultImageModel) {
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: { defaultModel: true, defaultImageModel: true },
      });
      if (u?.defaultModel) {
        await syncUserChatModel(user.id, u.defaultModel);
      }
      if (u?.defaultImageModel) {
        await syncUserImageModel(user.id, u.defaultImageModel);
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
    const secretFlags = await listSecretFlags(user.id);
    const customModels = await prisma.customModel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        provider: true,
        modelName: true,
        modelId: true,
        modelType: true,
      },
    });
    const providerId =
      (updated.llmProviderId && updated.llmProviderId.trim()) ||
      detectLlmProviderId(updated.llmBaseUrl) ||
      "openrouter";

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      defaultModel: refreshedUser?.defaultModel ?? updated.defaultModel,
      defaultImageModel: refreshedUser?.defaultImageModel ?? updated.defaultImageModel,
      llmBaseUrl: updated.llmBaseUrl,
      llmProviderId: providerId,
      customModels,
      effectiveLlmBaseUrl: resolveLlmBaseUrl(updated.llmBaseUrl),
      emailNotifications: updated.emailNotifications,
      telegramNotifications: updated.telegramNotifications,
      telegramChatEnabled: updated.telegramChatEnabled,
      telegramChatId: updated.telegramChatId,
      telegramDefaultAgentId: updated.telegramDefaultAgentId,
      xAutoPostEnabled: updated.xAutoPostEnabled,
      solanaDefaultRpc: updated.solanaDefaultRpc,
      effectiveSolanaDefaultRpc: updated.solanaDefaultRpc?.trim() || DEFAULT_SOLANA_RPC,
      fallbackRpcUrls: updated.fallbackRpcUrls ?? [],
      webhookStatus,
      telegramPollingMode: baseUrl.includes("localhost") || process.env.TELEGRAM_POLLING === "true",
      hasOpenRouterKey: secretFlags.hasLlmApiKey,
      hasLlmApiKey: secretFlags.hasLlmApiKey,
      hasTelegramToken: secretFlags.hasTelegramToken || !!process.env.TELEGRAM_BOT_TOKEN,
      hasXCredentials: xConnection.connected,
      hasXApiKey: secretFlags.hasXApiKey,
      hasXApiSecret: secretFlags.hasXApiSecret,
      hasXAccessToken: secretFlags.hasXAccessToken,
      hasXAccessSecret: secretFlags.hasXAccessSecret,
      hasSolanaRpcApiKey: secretFlags.hasSolanaRpcApiKey || !!process.env.SOLANA_RPC_API_KEY,
      hasJinaApiKey: secretFlags.hasJinaApiKey,
      hasBrainDatabaseUrl: !!updated.brainDatabaseUrl,
      brainDatabaseUrl: updated.brainDatabaseUrl
        ? decryptSafe(updated.brainDatabaseUrl)
        : null,
      fallbackModels: updated.fallbackModels ?? [],
      fallbackImageModels: updated.fallbackImageModels ?? [],
      agentMemoryEnabled: updated.agentMemoryEnabled ?? false,
      agentMemoryUrl: updated.agentMemoryUrl ?? null,
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
