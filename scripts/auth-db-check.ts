import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name IN ('fallbackModels', 'agentMemoryEnabled', 'agentMemoryUrl', 'password', 'email')
      ORDER BY column_name
    `;
    console.log("User columns present:", cols.map((c) => c.column_name).join(", ") || "(none)");

    const users = await prisma.user.findMany({
      select: { email: true, password: true },
    });
    console.log("Total users:", users.length);
    for (const u of users) {
      const masked = u.email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
      console.log(`  - ${masked} | hasPassword: ${u.password ? "yes" : "NO"}`);
    }

    const pending = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5
    `.catch(() => null);
    if (pending) {
      console.log("Recent migrations:", pending.map((m) => m.migration_name).join(", "));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
