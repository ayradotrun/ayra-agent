import { Pool, type PoolConfig } from "pg";
import type {
  BrainTaskRecord,
  BrainTaskStatus,
  BrainTaskType,
} from "@/lib/brain/brain-types";

const poolCache = new Map<string, { url: string; pool: Pool }>();

export const BRAIN_PG_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS brain_task (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  result TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_brain_task_agent_status_scheduled
  ON brain_task(agent_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_brain_task_user_status_scheduled
  ON brain_task(user_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_brain_task_status_scheduled
  ON brain_task(status, scheduled_at);

CREATE TABLE IF NOT EXISTS chat_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  title TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  chat_model TEXT,
  deep_thinking BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_session_user_pinned_updated
  ON chat_session(user_id, pinned DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_session_agent
  ON chat_session(agent_id);

CREATE TABLE IF NOT EXISTS chat_message (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  run_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_message_session_created
  ON chat_message(session_id, created_at);
`;

type BrainTaskPgRow = {
  id: string;
  user_id: string;
  agent_id: string;
  type: string;
  status: string;
  title: string;
  payload: unknown;
  scheduled_at: Date;
  completed_at: Date | null;
  result: string | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
};

function rowToRecord(row: BrainTaskPgRow): BrainTaskRecord {
  const payload =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    userId: row.user_id,
    agentId: row.agent_id,
    type: row.type as BrainTaskType,
    status: row.status as BrainTaskStatus,
    title: row.title,
    payload,
    scheduledAt: new Date(row.scheduled_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    result: row.result,
    error: row.error,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/** Strip ssl* query params so pg-connection-string does not force ssl=true (strict verify). */
function stripPgSslQueryParams(connectionString: string): string {
  return connectionString
    .replace(/([?&])sslmode=[^&]*(?=&|$)/gi, "$1")
    .replace(/([?&])sslcert=[^&]*(?=&|$)/gi, "$1")
    .replace(/([?&])sslkey=[^&]*(?=&|$)/gi, "$1")
    .replace(/([?&])sslrootcert=[^&]*(?=&|$)/gi, "$1")
    .replace(/([?&])sslnegotiation=[^&]*(?=&|$)/gi, "$1")
    .replace(/([?&])uselibpqcompat=[^&]*(?=&|$)/gi, "$1")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "");
}

function isLocalPgHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".local");
}

function readSslMode(connectionString: string): string | undefined {
  const match = connectionString.match(/[?&]sslmode=([^&]+)/i);
  return match?.[1]?.toLowerCase();
}

function readPgHost(connectionString: string): string | undefined {
  try {
    const normalized = connectionString.replace(/^postgres:\/\//, "postgresql://");
    return new URL(normalized).hostname;
  } catch {
    const match = connectionString.match(/@([^:/]+)/);
    return match?.[1];
  }
}

/** SSL for user BYOD Postgres (Supabase, Neon, etc.) — avoids "self-signed certificate in certificate chain". */
export function resolvePgSsl(connectionString: string): PoolConfig["ssl"] {
  const sslmode = readSslMode(connectionString);
  const host = readPgHost(connectionString);
  const isLocal = host ? isLocalPgHost(host) : false;

  if (sslmode === "disable" || sslmode === "off") {
    return false;
  }

  if (sslmode === "verify-full") {
    return true;
  }

  if (!isLocal) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

function buildPgPoolConfig(
  connectionString: string,
  overrides?: Partial<PoolConfig>
): PoolConfig {
  const cleaned = stripPgSslQueryParams(connectionString);
  const ssl = resolvePgSsl(connectionString);

  return {
    connectionString: cleaned,
    ssl,
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...overrides,
  };
}

export function getBrainPgPool(userId: string, connectionString: string): Pool {
  const cached = poolCache.get(userId);
  if (cached && cached.url === connectionString) return cached.pool;

  if (cached) {
    void cached.pool.end().catch(() => undefined);
  }

  const pool = new Pool(buildPgPoolConfig(connectionString));

  poolCache.set(userId, { url: connectionString, pool });
  return pool;
}

export function clearBrainPgPool(userId: string): void {
  const cached = poolCache.get(userId);
  if (!cached) return;
  void cached.pool.end().catch(() => undefined);
  poolCache.delete(userId);
}

export async function ensureBrainPgSchema(pool: Pool): Promise<void> {
  await pool.query(BRAIN_PG_SCHEMA_SQL);
}

export async function testBrainPgConnection(connectionString: string): Promise<void> {
  const pool = new Pool(buildPgPoolConfig(connectionString, { max: 1 }));

  try {
    await pool.query("SELECT 1");
    await ensureBrainPgSchema(pool);
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export async function pgCreateBrainTask(
  pool: Pool,
  input: {
    userId: string;
    agentId: string;
    type: BrainTaskType;
    title: string;
    payload?: Record<string, unknown>;
    scheduledAt: Date;
  }
): Promise<BrainTaskRecord> {
  const now = new Date();
  const id = `bt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  await pool.query(
    `
    INSERT INTO brain_task (
      id, user_id, agent_id, type, status, title, payload,
      scheduled_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6::jsonb, $7, $8, $9)
  `,
    [
      id,
      input.userId,
      input.agentId,
      input.type,
      input.title,
      JSON.stringify(input.payload ?? {}),
      input.scheduledAt.toISOString(),
      now.toISOString(),
      now.toISOString(),
    ]
  );

  const task = await pgGetBrainTaskById(pool, input.userId, id);
  if (!task) throw new Error("Failed to create brain task");
  return task;
}

export async function pgGetBrainTaskById(
  pool: Pool,
  userId: string,
  taskId: string
): Promise<BrainTaskRecord | null> {
  const result = await pool.query<BrainTaskPgRow>(
    `SELECT * FROM brain_task WHERE id = $1 AND user_id = $2`,
    [taskId, userId]
  );
  const row = result.rows[0];
  return row ? rowToRecord(row) : null;
}

export async function pgListBrainTasks(
  pool: Pool,
  userId: string,
  filter: {
    agentId?: string;
    status?: BrainTaskStatus | BrainTaskStatus[];
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    limit?: number;
    order?: "asc" | "desc";
  }
): Promise<BrainTaskRecord[]> {
  const clauses: string[] = ["user_id = $1"];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (filter.agentId) {
    clauses.push(`agent_id = $${paramIndex++}`);
    params.push(filter.agentId);
  }

  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    clauses.push(`status = ANY($${paramIndex++})`);
    params.push(statuses);
  }

  if (filter.scheduledAfter) {
    clauses.push(`scheduled_at >= $${paramIndex++}`);
    params.push(filter.scheduledAfter.toISOString());
  }

  if (filter.scheduledBefore) {
    clauses.push(`scheduled_at <= $${paramIndex++}`);
    params.push(filter.scheduledBefore.toISOString());
  }

  const order = filter.order === "desc" ? "DESC" : "ASC";
  const limit = filter.limit ?? 100;

  const result = await pool.query<BrainTaskPgRow>(
    `
    SELECT * FROM brain_task
    WHERE ${clauses.join(" AND ")}
    ORDER BY scheduled_at ${order}
    LIMIT $${paramIndex}
  `,
    [...params, limit]
  );

  return result.rows.map(rowToRecord);
}

export async function pgCountBrainTasks(
  pool: Pool,
  userId: string,
  filter: {
    agentId?: string;
    status?: BrainTaskStatus;
    scheduledBefore?: Date;
  }
): Promise<number> {
  const clauses: string[] = ["user_id = $1"];
  const params: unknown[] = [userId];
  let paramIndex = 2;

  if (filter.agentId) {
    clauses.push(`agent_id = $${paramIndex++}`);
    params.push(filter.agentId);
  }
  if (filter.status) {
    clauses.push(`status = $${paramIndex++}`);
    params.push(filter.status);
  }
  if (filter.scheduledBefore) {
    clauses.push(`scheduled_at <= $${paramIndex++}`);
    params.push(filter.scheduledBefore.toISOString());
  }

  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM brain_task WHERE ${clauses.join(" AND ")}`,
    params
  );

  return parseInt(result.rows[0]?.count ?? "0", 10);
}

export async function pgUpdateBrainTask(
  pool: Pool,
  userId: string,
  taskId: string,
  data: Partial<{
    status: BrainTaskStatus;
    completedAt: Date | null;
    result: string | null;
    error: string | null;
  }>
): Promise<BrainTaskRecord | null> {
  const existing = await pgGetBrainTaskById(pool, userId, taskId);
  if (!existing) return null;

  const sets: string[] = ["updated_at = $1"];
  const params: unknown[] = [new Date().toISOString()];
  let paramIndex = 2;

  if (data.status !== undefined) {
    sets.push(`status = $${paramIndex++}`);
    params.push(data.status);
  }
  if (data.completedAt !== undefined) {
    sets.push(`completed_at = $${paramIndex++}`);
    params.push(data.completedAt ? data.completedAt.toISOString() : null);
  }
  if (data.result !== undefined) {
    sets.push(`result = $${paramIndex++}`);
    params.push(data.result);
  }
  if (data.error !== undefined) {
    sets.push(`error = $${paramIndex++}`);
    params.push(data.error);
  }

  params.push(taskId, userId);
  await pool.query(
    `UPDATE brain_task SET ${sets.join(", ")} WHERE id = $${paramIndex++} AND user_id = $${paramIndex}`,
    params
  );

  return pgGetBrainTaskById(pool, userId, taskId);
}

export async function pgFindDueBrainTasks(
  pool: Pool,
  userId: string,
  limit: number
): Promise<Array<{ userId: string; taskId: string; scheduledAt: string }>> {
  const result = await pool.query<{ id: string; scheduled_at: Date }>(
    `
    SELECT id, scheduled_at
    FROM brain_task
    WHERE user_id = $1 AND status = 'PENDING' AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT $2
  `,
    [userId, limit]
  );

  return result.rows.map((row) => ({
    userId,
    taskId: row.id,
    scheduledAt: new Date(row.scheduled_at).toISOString(),
  }));
}

export async function pgImportBrainTasks(
  pool: Pool,
  tasks: BrainTaskRecord[]
): Promise<number> {
  if (tasks.length === 0) return 0;

  let imported = 0;
  for (const task of tasks) {
    const result = await pool.query(
      `
      INSERT INTO brain_task (
        id, user_id, agent_id, type, status, title, payload,
        scheduled_at, completed_at, result, error, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (id) DO NOTHING
    `,
      [
        task.id,
        task.userId,
        task.agentId,
        task.type,
        task.status,
        task.title,
        JSON.stringify(task.payload ?? {}),
        task.scheduledAt.toISOString(),
        task.completedAt?.toISOString() ?? null,
        task.result,
        task.error,
        task.createdAt.toISOString(),
        task.updatedAt.toISOString(),
      ]
    );
    imported += result.rowCount ?? 0;
  }

  return imported;
}
