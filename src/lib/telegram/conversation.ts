import {
  createChatMessage,
  createChatSession,
  getChatSession,
  listChatMessages,
  listChatSessions,
  updateChatSession,
} from "@/lib/chat/chat-store";

export const TELEGRAM_SESSION_TITLE = "📱 Telegram";

export async function getOrCreateTelegramSession(userId: string, agentId: string) {
  const sessions = await listChatSessions(userId, 60);
  const existing = sessions.find(
    (s) => s.title === TELEGRAM_SESSION_TITLE && s.agentId === agentId
  );
  if (existing) return existing;

  const byTitle = sessions.find((s) => s.title === TELEGRAM_SESSION_TITLE);
  if (byTitle) {
    const updated = await updateChatSession(userId, byTitle.id, {
      agentId,
      updatedAt: new Date(),
    });
    if (updated) return updated;
  }

  const session = await createChatSession(userId, agentId);
  await updateChatSession(userId, session.id, {
    title: TELEGRAM_SESSION_TITLE,
    updatedAt: new Date(),
  });

  return { ...session, title: TELEGRAM_SESSION_TITLE };
}

const MAX_HISTORY_CHARS = 2200;

function trimHistoryContent(content: string): string {
  if (content.length <= MAX_HISTORY_CHARS) return content;
  return `${content.slice(0, MAX_HISTORY_CHARS)}\n… _(truncated for context window)_`;
}

export async function loadTelegramChatHistory(
  userId: string,
  sessionId: string,
  limit = 20
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await listChatMessages(userId, sessionId, { order: "desc", limit });
  return messages.reverse().map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: trimHistoryContent(m.content),
  }));
}

export async function recordTelegramUserMessage(
  userId: string,
  sessionId: string,
  content: string
): Promise<void> {
  await createChatMessage(userId, sessionId, { role: "user", content });
  await updateChatSession(userId, sessionId, { updatedAt: new Date() });
}

export async function recordTelegramAssistantMessage(
  userId: string,
  sessionId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createChatMessage(userId, sessionId, {
    role: "assistant",
    content,
    metadata: metadata ?? null,
  });
  await updateChatSession(userId, sessionId, { updatedAt: new Date() });
}

/** History for runAgent — excludes the message we're about to send (caller adds userMessage). */
export async function telegramHistoryForAgent(userId: string, sessionId: string) {
  const messages = await loadTelegramChatHistory(userId, sessionId, 24);
  if (messages.length <= 1) return [];
  return messages.slice(0, -1);
}

export async function syncTelegramSessionAgent(
  userId: string,
  sessionId: string,
  agentId: string
): Promise<void> {
  const session = await getChatSession(userId, sessionId);
  if (session && session.agentId !== agentId) {
    await updateChatSession(userId, sessionId, { agentId, updatedAt: new Date() });
  }
}
