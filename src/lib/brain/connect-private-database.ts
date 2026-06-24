import { encryptSafe } from "@/lib/encryption";
import { prisma } from "@/lib/db";
import {
  allowPlatformBrainDatabase,
  isPlatformDatabaseUrl,
  isValidBrainDatabaseUrl,
  resolvePrivateDatabaseUrl,
} from "@/lib/brain/brain-db-url";
import {
  migrateSqliteBrainToPostgres,
  testBrainPgConnection,
} from "@/lib/brain/brain-store";
import { migratePrismaChatToPrivatePostgres } from "@/lib/chat/chat-store";

export class PrivateDatabaseConnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivateDatabaseConnectError";
  }
}

export async function connectUserPrivateDatabase(
  userId: string,
  rawUrl: string
): Promise<string> {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    throw new PrivateDatabaseConnectError("Private database URL is required.");
  }

  if (!isValidBrainDatabaseUrl(trimmed)) {
    throw new PrivateDatabaseConnectError(
      "Invalid brain database URL. Use postgresql:// or postgres:// format."
    );
  }

  if (isPlatformDatabaseUrl(trimmed) && !allowPlatformBrainDatabase()) {
    throw new PrivateDatabaseConnectError(
      "This URL is the AYRA platform database. Create your own empty Postgres project (Supabase, Neon, etc.) and paste that URL instead — or set AYRA_ALLOW_PLATFORM_BRAIN_DB=true for solo self-host."
    );
  }

  const connectionUrl = resolvePrivateDatabaseUrl(trimmed);

  try {
    await testBrainPgConnection(connectionUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    throw new PrivateDatabaseConnectError(`Could not connect: ${message}`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { brainDatabaseUrl: encryptSafe(connectionUrl) },
  });

  try {
    const imported = await migrateSqliteBrainToPostgres(userId, connectionUrl);
    if (imported > 0) {
      console.log(`[Brain] Imported ${imported} task(s) into private DB for ${userId.slice(0, 8)}…`);
    }
  } catch (error) {
    console.warn("[Brain] SQLite → private Postgres import skipped:", error);
  }

  try {
    const chatImported = await migratePrismaChatToPrivatePostgres(userId, connectionUrl);
    if (chatImported.sessions > 0 || chatImported.messages > 0) {
      console.log(
        `[Chat] Imported ${chatImported.sessions} session(s) and ${chatImported.messages} message(s) into private DB for ${userId.slice(0, 8)}…`
      );
    }
  } catch (error) {
    console.warn("[Chat] Main DB → private Postgres import skipped:", error);
  }

  return connectionUrl;
}
