import { decryptSafe } from "@/lib/encryption";
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
