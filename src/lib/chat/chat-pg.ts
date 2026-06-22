import { Pool } from "pg";
import type {
  ChatMessageRecord,
  ChatSessionPatch,
  ChatSessionRecord,
  CreateChatMessageInput,
} from "@/lib/chat/chat-types";

type ChatSessionRow = {
  id: string;
  user_id: string;
  agent_id: string;
  title: string | null;
  pinned: boolean;
  chat_model: string | null;
  deep_thinking: boolean;
  created_at: Date;
  updated_at: Date;
};

type ChatMessageRow = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  run_id: string | null;
  metadata: unknown;
  created_at: Date;
};

function sessionRowToRecord(row: ChatSessionRow): ChatSessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    agentId: row.agent_id,
    title: row.title,
    pinned: row.pinned,
    chatModel: row.chat_model,
    deepThinking: row.deep_thinking,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function messageRowToRecord(row: ChatMessageRow): ChatMessageRecord {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null;

  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    runId: row.run_id,
    metadata,
    createdAt: new Date(row.created_at),
  };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function pgListChatSessions(
  pool: Pool,
  userId: string,
  limit = 40
): Promise<ChatSessionRecord[]> {
  const result = await pool.query<ChatSessionRow>(
    `
    SELECT * FROM chat_session
    WHERE user_id = $1
    ORDER BY pinned DESC, updated_at DESC
    LIMIT $2
  `,
    [userId, limit]
  );
  return result.rows.map(sessionRowToRecord);
}

export async function pgGetLastChatMessage(
  pool: Pool,
  sessionId: string
): Promise<ChatMessageRecord | null> {
  const result = await pool.query<ChatMessageRow>(
    `
    SELECT * FROM chat_message
    WHERE session_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [sessionId]
  );
  const row = result.rows[0];
  return row ? messageRowToRecord(row) : null;
}

export async function pgCreateChatSession(
  pool: Pool,
  userId: string,
  agentId: string
): Promise<ChatSessionRecord> {
  const now = new Date();
  const id = newId("cs");

  await pool.query(
    `
    INSERT INTO chat_session (
      id, user_id, agent_id, pinned, deep_thinking, created_at, updated_at
    ) VALUES ($1, $2, $3, false, false, $4, $4)
  `,
    [id, userId, agentId, now.toISOString()]
  );

  const session = await pgGetChatSession(pool, userId, id);
  if (!session) throw new Error("Failed to create chat session");
  return session;
}

export async function pgGetChatSession(
  pool: Pool,
  userId: string,
  sessionId: string
): Promise<ChatSessionRecord | null> {
  const result = await pool.query<ChatSessionRow>(
    `SELECT * FROM chat_session WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  const row = result.rows[0];
  return row ? sessionRowToRecord(row) : null;
}

export async function pgListChatMessages(
  pool: Pool,
  sessionId: string,
  options?: { order?: "asc" | "desc"; limit?: number }
): Promise<ChatMessageRecord[]> {
  const order = options?.order === "desc" ? "DESC" : "ASC";
  const limit = options?.limit;

  const result = limit
    ? await pool.query<ChatMessageRow>(
        `
        SELECT * FROM chat_message
        WHERE session_id = $1
        ORDER BY created_at ${order}
        LIMIT $2
      `,
        [sessionId, limit]
      )
    : await pool.query<ChatMessageRow>(
        `
        SELECT * FROM chat_message
        WHERE session_id = $1
        ORDER BY created_at ${order}
      `,
        [sessionId]
      );

  return result.rows.map(messageRowToRecord);
}

export async function pgUpdateChatSession(
  pool: Pool,
  userId: string,
  sessionId: string,
  patch: ChatSessionPatch
): Promise<ChatSessionRecord | null> {
  const existing = await pgGetChatSession(pool, userId, sessionId);
  if (!existing) return null;

  const sets: string[] = ["updated_at = $1"];
  const params: unknown[] = [(patch.updatedAt ?? new Date()).toISOString()];
  let idx = 2;

  if (patch.title !== undefined) {
    sets.push(`title = $${idx++}`);
    params.push(patch.title);
  }
  if (patch.pinned !== undefined) {
    sets.push(`pinned = $${idx++}`);
    params.push(patch.pinned);
  }
  if (patch.chatModel !== undefined) {
    sets.push(`chat_model = $${idx++}`);
    params.push(patch.chatModel);
  }
  if (patch.deepThinking !== undefined) {
    sets.push(`deep_thinking = $${idx++}`);
    params.push(patch.deepThinking);
  }
  if (patch.agentId !== undefined) {
    sets.push(`agent_id = $${idx++}`);
    params.push(patch.agentId);
  }

  params.push(sessionId, userId);
  await pool.query(
    `UPDATE chat_session SET ${sets.join(", ")} WHERE id = $${idx++} AND user_id = $${idx}`,
    params
  );

  return pgGetChatSession(pool, userId, sessionId);
}

export async function pgDeleteChatSession(
  pool: Pool,
  userId: string,
  sessionId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM chat_session WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function pgCreateChatMessage(
  pool: Pool,
  sessionId: string,
  input: CreateChatMessageInput
): Promise<ChatMessageRecord> {
  const id = newId("cm");
  const now = new Date();

  await pool.query(
    `
    INSERT INTO chat_message (id, session_id, role, content, run_id, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
  `,
    [
      id,
      sessionId,
      input.role,
      input.content,
      input.runId ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      now.toISOString(),
    ]
  );

  const messages = await pgListChatMessages(pool, sessionId, { order: "desc", limit: 1 });
  const created = messages[0];
  if (!created || created.id !== id) throw new Error("Failed to create chat message");
  return created;
}

export async function pgImportChatData(
  pool: Pool,
  sessions: ChatSessionRecord[],
  messages: ChatMessageRecord[]
): Promise<{ sessions: number; messages: number }> {
  let sessionCount = 0;
  let messageCount = 0;

  for (const session of sessions) {
    const result = await pool.query(
      `
      INSERT INTO chat_session (
        id, user_id, agent_id, title, pinned, chat_model, deep_thinking, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        session.id,
        session.userId,
        session.agentId,
        session.title,
        session.pinned,
        session.chatModel,
        session.deepThinking,
        session.createdAt.toISOString(),
        session.updatedAt.toISOString(),
      ]
    );
    sessionCount += result.rowCount ?? 0;
  }

  for (const message of messages) {
    const result = await pool.query(
      `
      INSERT INTO chat_message (id, session_id, role, content, run_id, metadata, created_at)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        message.id,
        message.sessionId,
        message.role,
        message.content,
        message.runId,
        message.metadata ? JSON.stringify(message.metadata) : null,
        message.createdAt.toISOString(),
      ]
    );
    messageCount += result.rowCount ?? 0;
  }

  return { sessions: sessionCount, messages: messageCount };
}
