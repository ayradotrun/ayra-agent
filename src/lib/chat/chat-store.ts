import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getUserBrainDatabaseUrl } from "@/lib/brain/brain-db-url";
import { ensureBrainPgSchemaOnce, getBrainPgPool } from "@/lib/brain/brain-pg";
import {
  pgCreateChatMessage,
  pgCreateChatSession,
  pgDeleteChatSession,
  pgGetChatSession,
  pgGetLastChatMessage,
  pgImportChatData,
  pgListChatMessages,
  pgListChatSessions,
  pgUpdateChatSession,
} from "@/lib/chat/chat-pg";
import type {
  ChatMessageRecord,
  ChatSessionPatch,
  ChatSessionRecord,
  CreateChatMessageInput,
} from "@/lib/chat/chat-types";

function chatMigrationFlagPath(userId: string): string {
  const root = path.resolve(process.env.BRAIN_STORAGE_PATH || path.join(process.cwd(), "storage", "brain"));
  return path.join(root, userId, ".chat-migrated-from-main");
}

async function getPrivatePool(userId: string) {
  const url = await getUserBrainDatabaseUrl(userId);
  if (!url) return null;
  const pool = await getBrainPgPool(userId, url);
  await ensureBrainPgSchemaOnce(userId, url, pool);
  return pool;
}

export async function userHasPrivateChatDb(userId: string): Promise<boolean> {
  return !!(await getUserBrainDatabaseUrl(userId));
}

function prismaSessionToRecord(session: {
  id: string;
  userId: string;
  agentId: string;
  title: string | null;
  pinned: boolean;
  chatModel: string | null;
  deepThinking: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ChatSessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    agentId: session.agentId,
    title: session.title,
    pinned: session.pinned,
    chatModel: session.chatModel,
    deepThinking: session.deepThinking,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function prismaMessageToRecord(message: {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  runId: string | null;
  metadata: unknown;
  createdAt: Date;
}): ChatMessageRecord {
  const metadata =
    message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
      ? (message.metadata as Record<string, unknown>)
      : null;

  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    runId: message.runId,
    metadata,
    createdAt: message.createdAt,
  };
}

export async function listChatSessions(userId: string, limit = 40): Promise<ChatSessionRecord[]> {
  const pool = await getPrivatePool(userId);
  if (pool) return pgListChatSessions(pool, userId, limit);

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return sessions.map(prismaSessionToRecord);
}

export async function getLastChatMessage(
  userId: string,
  sessionId: string
): Promise<ChatMessageRecord | null> {
  const pool = await getPrivatePool(userId);
  if (pool) return pgGetLastChatMessage(pool, sessionId);

  const message = await prisma.chatMessage.findFirst({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });

  return message ? prismaMessageToRecord(message) : null;
}

export async function createChatSession(userId: string, agentId: string): Promise<ChatSessionRecord> {
  const pool = await getPrivatePool(userId);
  if (pool) return pgCreateChatSession(pool, userId, agentId);

  const session = await prisma.chatSession.create({
    data: { userId, agentId },
  });

  return prismaSessionToRecord(session);
}

export async function getChatSession(
  userId: string,
  sessionId: string
): Promise<ChatSessionRecord | null> {
  const pool = await getPrivatePool(userId);
  if (pool) return pgGetChatSession(pool, userId, sessionId);

  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) return null;
  return prismaSessionToRecord(session);
}

export async function listChatMessages(
  userId: string,
  sessionId: string,
  options?: { order?: "asc" | "desc"; limit?: number }
): Promise<ChatMessageRecord[]> {
  const pool = await getPrivatePool(userId);
  if (pool) return pgListChatMessages(pool, sessionId, options);

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: options?.order === "desc" ? "desc" : "asc" },
    ...(options?.limit ? { take: options.limit } : {}),
  });

  return messages.map(prismaMessageToRecord);
}

export async function updateChatSession(
  userId: string,
  sessionId: string,
  patch: ChatSessionPatch
): Promise<ChatSessionRecord | null> {
  const pool = await getPrivatePool(userId);
  if (pool) return pgUpdateChatSession(pool, userId, sessionId, patch);

  const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!existing || existing.userId !== userId) return null;

  const updated = await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
      ...(patch.chatModel !== undefined ? { chatModel: patch.chatModel } : {}),
      ...(patch.deepThinking !== undefined ? { deepThinking: patch.deepThinking } : {}),
      ...(patch.agentId !== undefined ? { agentId: patch.agentId } : {}),
      updatedAt: patch.updatedAt ?? new Date(),
    },
  });

  return prismaSessionToRecord(updated);
}

export async function deleteChatSession(userId: string, sessionId: string): Promise<boolean> {
  const pool = await getPrivatePool(userId);
  if (pool) return pgDeleteChatSession(pool, userId, sessionId);

  const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!existing || existing.userId !== userId) return false;

  await prisma.chatSession.delete({ where: { id: sessionId } });
  return true;
}

export async function createChatMessage(
  userId: string,
  sessionId: string,
  input: CreateChatMessageInput
): Promise<ChatMessageRecord> {
  const pool = await getPrivatePool(userId);
  if (pool) return pgCreateChatMessage(pool, sessionId, input);

  const message = await prisma.chatMessage.create({
    data: {
      sessionId,
      role: input.role,
      content: input.content,
      runId: input.runId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  return prismaMessageToRecord(message);
}

export async function migratePrismaChatToPrivatePostgres(
  userId: string,
  connectionString: string
): Promise<{ sessions: number; messages: number }> {
  if (fs.existsSync(chatMigrationFlagPath(userId))) {
    return { sessions: 0, messages: 0 };
  }

  const sessions = await prisma.chatSession.findMany({ where: { userId } });
  if (sessions.length === 0) {
    fs.mkdirSync(path.dirname(chatMigrationFlagPath(userId)), { recursive: true });
    fs.writeFileSync(chatMigrationFlagPath(userId), new Date().toISOString(), "utf8");
    return { sessions: 0, messages: 0 };
  }

  const sessionIds = sessions.map((s) => s.id);
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: { in: sessionIds } },
    orderBy: { createdAt: "asc" },
  });

  const pool = await getBrainPgPool(userId, connectionString);
  await ensureBrainPgSchemaOnce(userId, connectionString, pool);

  const imported = await pgImportChatData(
    pool,
    sessions.map(prismaSessionToRecord),
    messages.map(prismaMessageToRecord)
  );

  if (imported.sessions > 0 || imported.messages > 0) {
    await prisma.chatSession.deleteMany({ where: { userId } });
    console.log(
      `[Chat] Migrated ${imported.sessions} session(s) and ${imported.messages} message(s) to private DB for ${userId.slice(0, 8)}…`
    );
  }

  fs.mkdirSync(path.dirname(chatMigrationFlagPath(userId)), { recursive: true });
  fs.writeFileSync(chatMigrationFlagPath(userId), new Date().toISOString(), "utf8");

  return imported;
}

export type { ChatMessageRecord, ChatSessionRecord, ChatSessionPatch, CreateChatMessageInput };
