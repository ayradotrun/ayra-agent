#!/usr/bin/env tsx
/**
 * Verify database connectivity and print actionable fixes.
 * Usage: npm run db:verify
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

// Prefer .env file over stale shell DATABASE_URL (common on Windows)
function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) process.env[key] = value;
  }
}

loadDotEnv();

async function main() {
  const url = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_DATABASE_URL;

  console.log("\n🔍 AYRA Agent — Database Check\n");

  if (!url) {
    console.error("❌ DATABASE_URL is missing in .env");
    process.exit(1);
  }

  try {
    const host = new URL(url.replace("postgresql://", "http://")).host;
    console.log(`📡 DATABASE_URL host: ${host}`);
    if (direct) {
      const directHost = new URL(direct.replace("postgresql://", "http://")).host;
      console.log(`📡 DIRECT_DATABASE_URL host: ${directHost}`);
    } else {
      console.warn("⚠️  DIRECT_DATABASE_URL not set — add Session pooler URL from Supabase for migrations");
    }
  } catch {
    console.warn("⚠️  Could not parse DATABASE_URL");
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful\n");
    const tables = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'
    `;
    console.log(`📊 Public tables: ${tables[0]?.count ?? 0}`);
    if (Number(tables[0]?.count ?? 0) === 0) {
      console.log("\n→ Run: npm run db:push   (or npm run prisma:migrate)");
      console.log("→ Then: npm run prisma:seed\n");
    }
  } catch (error) {
    console.error("❌ Connection failed\n");
    if (error instanceof Error) console.error(error.message);
    console.log(`
Fix checklist:
1. Supabase → Project Settings → Database → Connect
2. Copy Session pooler URI → DIRECT_DATABASE_URL
3. Copy Transaction pooler URI → DATABASE_URL
4. Add ?sslmode=require to both URLs
5. Username must be postgres.YOUR_PROJECT_REF (not just postgres)
6. Remove conflicting Windows User env var DATABASE_URL if set
7. Wake paused Supabase project in dashboard

Then run: npm run db:push
`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
