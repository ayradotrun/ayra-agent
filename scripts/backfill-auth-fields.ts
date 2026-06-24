#!/usr/bin/env tsx
/**
 * Backfill username + emailVerified for existing users.
 * Usage: npm run auth:backfill
 */
import { PrismaClient } from "@prisma/client";
import { deriveUsernameFromEmail } from "../src/lib/auth/username";

async function uniqueUsername(
  prisma: PrismaClient,
  base: string,
  excludeUserId?: string
): Promise<string> {
  let candidate = base.slice(0, 30);
  let suffix = 0;

  while (true) {
    const existing = await prisma.user.findFirst({
      where: {
        username: candidate,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;

    suffix += 1;
    const suffixText = `_${suffix}`;
    candidate = `${base.slice(0, 30 - suffixText.length)}${suffixText}`;
  }
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, username: true, emailVerified: true, createdAt: true },
    });

    let updated = 0;
    for (const user of users) {
      const data: { username?: string; emailVerified?: Date } = {};

      if (!user.username) {
        data.username = await uniqueUsername(prisma, deriveUsernameFromEmail(user.email), user.id);
      }

      if (!user.emailVerified) {
        data.emailVerified = user.createdAt;
      }

      if (Object.keys(data).length > 0) {
        await prisma.user.update({ where: { id: user.id }, data });
        updated += 1;
        console.log(`Updated ${user.email} → username: ${data.username ?? user.username}`);
      }
    }

    console.log(`\nDone. Updated ${updated} user(s).\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
