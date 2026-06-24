#!/usr/bin/env tsx
/**
 * Reset a user's password (local/dev recovery).
 * Usage: npm run auth:reset-password -- email@example.com NewPassword123
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];

  if (!email || !password) {
    console.error("\nUsage: npm run auth:reset-password -- email@example.com NewPassword123\n");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true },
    });

    if (!user) {
      console.error(`No user found for email: ${email}`);
      console.error("Register at /register or check DATABASE_URL points to the right Supabase project.");
      process.exit(1);
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    console.log(`\n✅ Password updated for ${user.email}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
