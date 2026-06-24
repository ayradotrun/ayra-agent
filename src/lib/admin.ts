import { prisma } from "@/lib/prisma";
import { requireAuth, forbiddenResponse } from "@/lib/auth-helpers";

export class AdminError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "AdminError";
  }
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return isAdminEmail(user?.email);
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (!(await isAdminUser(user.id))) {
    throw new AdminError();
  }
  return user;
}

export function adminForbiddenResponse() {
  return forbiddenResponse();
}
