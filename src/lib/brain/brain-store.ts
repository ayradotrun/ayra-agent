import fs from "fs";
import path from "path";
import BetterSqlite3 from "better-sqlite3";
import { prisma } from "@/lib/prisma";
import { getUserBrainDatabaseUrl, listUsersWithBrainDatabase } from "@/lib/brain/brain-db-url";
import {
  ensureBrainPgSchemaOnce,
  getBrainPgPool,
  pgCountBrainTasks,
  pgCreateBrainTask,
  pgFindDueBrainTasks,
  pgGetBrainTaskById,
  pgImportBrainTasks,
  pgListBrainTasks,
  pgUpdateBrainTask,
} from "@/lib/brain/brain-pg";
import type {
  BrainTaskCountFilter,
  BrainTaskFilter,
  BrainTaskRecord,
  BrainTaskStatus,
  BrainTaskType,
  BrainTaskUpdate,
  CreateBrainTaskInput,
} from "@/lib/brain/brain-types";

export type {
  BrainTaskCountFilter,
  BrainTaskFilter,
  BrainTaskRecord,
  BrainTaskStatus,
  BrainTaskType,
  BrainTaskUpdate,
  CreateBrainTaskInput,
} from "@/lib/brain/brain-types";

type SqliteDb = BetterSqlite3.Database;

type BrainTaskRow = {
  id: string;
  user_id: string;
  agent_id: string;
  type: string;
  status: string;
  title: string;
  payload: string;
  scheduled_at: string;
  completed_at: string | null;
  result: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const sqliteCache = new Map<string, SqliteDb>();

function getBrainStorageRoot(): string {
  return path.resolve(process.env.BRAIN_STORAGE_PATH || path.join(process.cwd(), "storage", "brain"));
}

function userBrainDir(userId: string): string {
  return path.join(getBrainStorageRoot(), userId);
}

function userDbPath(userId: string): string {
  return path.join(userBrainDir(userId), "brain.sqlite");
}

function migrationFlagPath(userId: string): string {
  return path.join(userBrainDir(userId), ".migrated-from-postgres");
}

function sqliteInitSchema(db: SqliteDb): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS brain_task (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      title TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      scheduled_at TEXT NOT NULL,
      completed_at TEXT,
      result TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_brain_task_agent_status_scheduled
      ON brain_task(agent_id, status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_brain_task_user_status_scheduled
      ON brain_task(user_id, status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_brain_task_status_scheduled
      ON brain_task(status, scheduled_at);
  `);
}

function sqliteRowToRecord(row: BrainTaskRow): BrainTaskRecord {
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(row.payload) as Record<string, unknown>;
  } catch {
    payload = {};
  }

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

async function migrateLegacyPostgresToSqlite(userId: string, db: SqliteDb): Promise<void> {
  if (fs.existsSync(migrationFlagPath(userId))) return;

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        agentId: string;
        type: string;
        status: string;
        title: string;
        payload: unknown;
        scheduledAt: Date;
        completedAt: Date | null;
        result: string | null;
        error: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    >`
      SELECT *
      FROM "BrainTask"
      WHERE "userId" = ${userId}
    `;

    if (rows.length > 0) {
      const insert = db.prepare(`
        INSERT OR IGNORE INTO brain_task (
          id, user_id, agent_id, type, status, title, payload,
          scheduled_at, completed_at, result, error, created_at, updated_at
        ) VALUES (
          @id, @user_id, @agent_id, @type, @status, @title, @payload,
          @scheduled_at, @completed_at, @result, @error, @created_at, @updated_at
        )
      `);

      const migrateAll = db.transaction((tasks: typeof rows) => {
        for (const task of tasks) {
          insert.run({
            id: task.id,
            user_id: task.userId,
            agent_id: task.agentId,
            type: task.type,
            status: task.status,
            title: task.title,
            payload: JSON.stringify(task.payload ?? {}),
            scheduled_at: task.scheduledAt.toISOString(),
            completed_at: task.completedAt?.toISOString() ?? null,
            result: task.result,
            error: task.error,
            created_at: task.createdAt.toISOString(),
            updated_at: task.updatedAt.toISOString(),
          });
        }
      });

      migrateAll(rows);
      console.log(`[Brain] Migrated ${rows.length} legacy task(s) for user ${userId.slice(0, 8)}…`);
    }

    fs.writeFileSync(migrationFlagPath(userId), new Date().toISOString(), "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('relation "BrainTask" does not exist')) {
      fs.writeFileSync(migrationFlagPath(userId), "no-postgres-table", "utf8");
      return;
    }
    console.warn(`[Brain] Legacy migration skipped for ${userId.slice(0, 8)}…:`, message);
  }
}

function getSqliteDb(userId: string): SqliteDb {
  let db = sqliteCache.get(userId);
  if (db) return db;

  const dir = userBrainDir(userId);
  fs.mkdirSync(dir, { recursive: true });

  db = new BetterSqlite3(userDbPath(userId));
  db.pragma("journal_mode = WAL");
  sqliteInitSchema(db);
  sqliteCache.set(userId, db);

  void migrateLegacyPostgresToSqlite(userId, db);

  return db;
}

export function listLocalBrainUserIds(): string[] {
  const root = getBrainStorageRoot();
  if (!fs.existsSync(root)) return [];

  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export async function migrateSqliteBrainToPostgres(
  userId: string,
  connectionString: string
): Promise<number> {
  const db = getSqliteDb(userId);
  const rows = db
    .prepare(`SELECT * FROM brain_task WHERE user_id = ?`)
    .all(userId) as BrainTaskRow[];

  if (rows.length === 0) return 0;

  const pool = await getBrainPgPool(userId, connectionString);
  await ensureBrainPgSchemaOnce(userId, connectionString, pool);
  return pgImportBrainTasks(pool, rows.map(sqliteRowToRecord));
}

function sqliteCreateBrainTask(input: CreateBrainTaskInput): BrainTaskRecord {
  const db = getSqliteDb(input.userId);
  const now = new Date();
  const id = `bt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

  db.prepare(
    `
    INSERT INTO brain_task (
      id, user_id, agent_id, type, status, title, payload,
      scheduled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    input.userId,
    input.agentId,
    input.type,
    input.title,
    JSON.stringify(input.payload ?? {}),
    input.scheduledAt.toISOString(),
    now.toISOString(),
    now.toISOString()
  );

  return sqliteGetBrainTaskById(input.userId, id)!;
}

function sqliteGetBrainTaskById(userId: string, taskId: string): BrainTaskRecord | null {
  const db = getSqliteDb(userId);
  const row = db.prepare(`SELECT * FROM brain_task WHERE id = ?`).get(taskId) as
    | BrainTaskRow
    | undefined;
  return row ? sqliteRowToRecord(row) : null;
}

function sqliteListBrainTasks(userId: string, filter: BrainTaskFilter): BrainTaskRecord[] {
  const db = getSqliteDb(userId);
  const clauses: string[] = ["user_id = ?"];
  const params: unknown[] = [userId];

  if (filter.agentId) {
    clauses.push("agent_id = ?");
    params.push(filter.agentId);
  }

  if (filter.status) {
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    clauses.push(`status IN (${statuses.map(() => "?").join(", ")})`);
    params.push(...statuses);
  }

  if (filter.scheduledAfter) {
    clauses.push("scheduled_at >= ?");
    params.push(filter.scheduledAfter.toISOString());
  }

  if (filter.scheduledBefore) {
    clauses.push("scheduled_at <= ?");
    params.push(filter.scheduledBefore.toISOString());
  }

  const order = filter.order === "desc" ? "DESC" : "ASC";
  const limit = filter.limit ?? 100;

  const rows = db
    .prepare(
      `SELECT * FROM brain_task WHERE ${clauses.join(" AND ")} ORDER BY scheduled_at ${order} LIMIT ?`
    )
    .all(...params, limit) as BrainTaskRow[];

  return rows.map(sqliteRowToRecord);
}

function sqliteCountBrainTasks(userId: string, filter: BrainTaskCountFilter): number {
  const db = getSqliteDb(userId);
  const clauses: string[] = ["user_id = ?"];
  const params: unknown[] = [userId];

  if (filter.agentId) {
    clauses.push("agent_id = ?");
    params.push(filter.agentId);
  }
  if (filter.status) {
    clauses.push("status = ?");
    params.push(filter.status);
  }
  if (filter.scheduledBefore) {
    clauses.push("scheduled_at <= ?");
    params.push(filter.scheduledBefore.toISOString());
  }

  const row = db
    .prepare(`SELECT COUNT(*) as count FROM brain_task WHERE ${clauses.join(" AND ")}`)
    .get(...params) as { count: number };

  return row.count;
}

function sqliteUpdateBrainTask(
  userId: string,
  taskId: string,
  data: BrainTaskUpdate
): BrainTaskRecord | null {
  const db = getSqliteDb(userId);
  const existing = sqliteGetBrainTaskById(userId, taskId);
  if (!existing) return null;

  const sets: string[] = ["updated_at = ?"];
  const params: unknown[] = [new Date().toISOString()];

  if (data.status !== undefined) {
    sets.push("status = ?");
    params.push(data.status);
  }
  if (data.completedAt !== undefined) {
    sets.push("completed_at = ?");
    params.push(data.completedAt ? data.completedAt.toISOString() : null);
  }
  if (data.result !== undefined) {
    sets.push("result = ?");
    params.push(data.result);
  }
  if (data.error !== undefined) {
    sets.push("error = ?");
    params.push(data.error);
  }

  params.push(taskId);
  db.prepare(`UPDATE brain_task SET ${sets.join(", ")} WHERE id = ?`).run(...params);

  return sqliteGetBrainTaskById(userId, taskId);
}

function sqliteFindDueBrainTasks(
  userId: string,
  limit: number
): Array<{ userId: string; taskId: string; scheduledAt: string }> {
  const db = getSqliteDb(userId);
  const now = new Date().toISOString();
  const rows = db
    .prepare(
      `
      SELECT id, scheduled_at
      FROM brain_task
      WHERE status = 'PENDING' AND scheduled_at <= ?
      ORDER BY scheduled_at ASC
      LIMIT ?
    `
    )
    .all(now, limit) as Array<{ id: string; scheduled_at: string }>;

  return rows.map((row) => ({
    userId,
    taskId: row.id,
    scheduledAt: row.scheduled_at,
  }));
}

export async function createBrainTask(input: CreateBrainTaskInput): Promise<BrainTaskRecord> {
  const dbUrl = await getUserBrainDatabaseUrl(input.userId);
  if (dbUrl) {
    const pool = await getBrainPgPool(input.userId, dbUrl);
    await ensureBrainPgSchemaOnce(input.userId, dbUrl, pool);
    return pgCreateBrainTask(pool, input);
  }
  return sqliteCreateBrainTask(input);
}

export async function getBrainTaskById(
  userId: string,
  taskId: string
): Promise<BrainTaskRecord | null> {
  const dbUrl = await getUserBrainDatabaseUrl(userId);
  if (dbUrl) {
    const pool = await getBrainPgPool(userId, dbUrl);
    await ensureBrainPgSchemaOnce(userId, dbUrl, pool);
    return pgGetBrainTaskById(pool, userId, taskId);
  }
  return sqliteGetBrainTaskById(userId, taskId);
}

export async function listBrainTasks(
  userId: string,
  filter: BrainTaskFilter
): Promise<BrainTaskRecord[]> {
  const dbUrl = await getUserBrainDatabaseUrl(userId);
  if (dbUrl) {
    const pool = await getBrainPgPool(userId, dbUrl);
    await ensureBrainPgSchemaOnce(userId, dbUrl, pool);
    return pgListBrainTasks(pool, userId, filter);
  }
  return sqliteListBrainTasks(userId, filter);
}

export async function countBrainTasks(
  userId: string,
  filter: BrainTaskCountFilter
): Promise<number> {
  const dbUrl = await getUserBrainDatabaseUrl(userId);
  if (dbUrl) {
    const pool = await getBrainPgPool(userId, dbUrl);
    await ensureBrainPgSchemaOnce(userId, dbUrl, pool);
    return pgCountBrainTasks(pool, userId, filter);
  }
  return sqliteCountBrainTasks(userId, filter);
}

export async function updateBrainTask(
  userId: string,
  taskId: string,
  data: BrainTaskUpdate
): Promise<BrainTaskRecord | null> {
  const dbUrl = await getUserBrainDatabaseUrl(userId);
  if (dbUrl) {
    const pool = await getBrainPgPool(userId, dbUrl);
    await ensureBrainPgSchemaOnce(userId, dbUrl, pool);
    return pgUpdateBrainTask(pool, userId, taskId, data);
  }
  return sqliteUpdateBrainTask(userId, taskId, data);
}

export async function findDueBrainTasksGlobally(
  limit = 10
): Promise<Array<{ userId: string; taskId: string }>> {
  const due: Array<{ userId: string; taskId: string; scheduledAt: string }> = [];
  const pgUserIds = new Set<string>();

  const pgUsers = await listUsersWithBrainDatabase();
  for (const user of pgUsers) {
    pgUserIds.add(user.id);
    try {
      const pool = await getBrainPgPool(user.id, user.brainDatabaseUrl);
      await ensureBrainPgSchemaOnce(user.id, user.brainDatabaseUrl, pool);
      const rows = await pgFindDueBrainTasks(pool, user.id, limit);
      due.push(...rows);
    } catch (error) {
      console.error(`[Brain] Due-task scan failed for ${user.id.slice(0, 8)}…:`, error);
    }
  }

  for (const userId of listLocalBrainUserIds()) {
    if (pgUserIds.has(userId)) continue;
    due.push(...sqliteFindDueBrainTasks(userId, limit));
  }

  due.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  return due.slice(0, limit).map(({ userId, taskId }) => ({ userId, taskId }));
}

export { clearBrainPgPool, testBrainPgConnection } from "@/lib/brain/brain-pg";
export { isValidBrainDatabaseUrl } from "@/lib/brain/brain-db-url";
