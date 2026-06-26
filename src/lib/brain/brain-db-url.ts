import { decryptSafe } from "@/lib/encryption";
import { normalizePrivateDatabaseUrl } from "@/lib/brain/normalize-pg-url";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const POSTGRES_URL_RE = /^postgres(ql)?:\/\/.+/i;

function isMissingBrainDatabaseColumn(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2022" &&
    String(error.message).includes("brainDatabaseUrl")
  );
}

export function isValidBrainDatabaseUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!POSTGRES_URL_RE.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function normalizePgUrlForCompare(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    const port = parsed.port || "5432";
    const db = parsed.pathname.replace(/^\//, "") || "postgres";
    return `${host}:${port}/${db}`;
  } catch {
    return null;
  }
}

/** Reject using the platform DATABASE_URL as a user's private BYOD database. */
export function isPlatformDatabaseUrl(url: string): boolean {
  const candidate = normalizePgUrlForCompare(url);
  if (!candidate) return false;

  for (const envKey of ["DATABASE_URL", "DIRECT_DATABASE_URL"] as const) {
    const platform = process.env[envKey]?.trim();
    if (!platform) continue;
    const normalized = normalizePgUrlForCompare(platform);
    if (normalized && normalized === candidate) return true;
  }
  return false;
}

/**
 * Solo / self-host: allow chat+brain tables on the same Postgres as the platform DB.
 * Set AYRA_ALLOW_PLATFORM_BRAIN_DB=true in production; allowed by default in development.
 */
export function allowPlatformBrainDatabase(): boolean {
  const raw = process.env.AYRA_ALLOW_PLATFORM_BRAIN_DB?.trim().toLowerCase();
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return process.env.NODE_ENV !== "production";
}

/** Prefer session/direct URL when user pasted the platform pooler URL (DDL needs direct). */
export function resolvePrivateDatabaseUrl(
  url: string,
  options?: { supabaseRegion?: string }
): string {
  const trimmed = normalizePrivateDatabaseUrl(url.trim(), options);
  if (!allowPlatformBrainDatabase() || !isPlatformDatabaseUrl(trimmed)) {
    return trimmed;
  }

  const pooler = process.env.DATABASE_URL?.trim();
  const direct = process.env.DIRECT_DATABASE_URL?.trim();
  if (
    pooler &&
    direct &&
    normalizePgUrlForCompare(trimmed) === normalizePgUrlForCompare(pooler)
  ) {
    return direct;
  }

  return trimmed;
}

export async function getUserBrainDatabaseUrl(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { brainDatabaseUrl: true },
    });

    if (!user?.brainDatabaseUrl) return null;
    return decryptSafe(user.brainDatabaseUrl);
  } catch (error) {
    if (isMissingBrainDatabaseColumn(error)) return null;
    throw error;
  }
}

export async function listUsersWithBrainDatabase(): Promise<Array<{ id: string; brainDatabaseUrl: string }>> {
  try {
    const users = await prisma.user.findMany({
      where: { brainDatabaseUrl: { not: null } },
      select: { id: true, brainDatabaseUrl: true },
    });

    return users
      .filter((u): u is { id: string; brainDatabaseUrl: string } => !!u.brainDatabaseUrl)
      .map((u) => ({
        id: u.id,
        brainDatabaseUrl: decryptSafe(u.brainDatabaseUrl),
      }));
  } catch (error) {
    if (isMissingBrainDatabaseColumn(error)) return [];
    throw error;
  }
}
