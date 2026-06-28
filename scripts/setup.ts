#!/usr/bin/env tsx
/**
 * First-time and upgrade setup for AYRA Agent.
 * Usage: npm run setup
 *
 * Safe by default — never passes --accept-data-loss to prisma db push.
 */
import { copyFileSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { execSync, spawnSync } from "child_process";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return false;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
  return true;
}

function run(cmd: string, opts: { allowFail?: boolean } = {}): boolean {
  console.log(`\n→ ${cmd}\n`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    env: process.env,
    cwd: process.cwd(),
  });
  const ok = (result.status ?? 1) === 0;
  if (!ok && !opts.allowFail) {
    return false;
  }
  return ok;
}

function runCapture(cmd: string): { ok: boolean; output: string } {
  const result = spawnSync(cmd, {
    shell: true,
    encoding: "utf8",
    env: process.env,
    cwd: process.cwd(),
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return { ok: (result.status ?? 1) === 0, output };
}

function requireEnv(keys: string[]): boolean {
  let ok = true;
  for (const key of keys) {
    const val = process.env[key]?.trim();
    if (!val) {
      console.error(`❌ Missing required env: ${key}`);
      ok = false;
    }
  }
  return ok;
}

async function syncDatabase(): Promise<boolean> {
  console.log("\n📦 Syncing platform database schema…\n");

  const migrate = runCapture("npx prisma migrate deploy");
  if (migrate.ok) {
    console.log("✅ Applied migrations via prisma migrate deploy");
    return true;
  }

  if (/P3005|not empty|baseline/i.test(migrate.output)) {
    console.warn(
      "⚠️  migrate deploy skipped (existing database without migration history — P3005 is normal)."
    );
  } else if (!/P1001|connect|ECONNREFUSED|Authentication failed/i.test(migrate.output)) {
    console.warn("⚠️  migrate deploy did not complete — trying db push…");
  } else {
    console.error("\n❌ Cannot connect to DATABASE_URL. Fix .env then run npm run db:verify\n");
    return false;
  }

  const push = runCapture("npx prisma db push --skip-generate");
  if (push.ok) {
    console.log("✅ Schema synced via prisma db push");
    return true;
  }

  if (/data loss|accept-data-loss/i.test(push.output)) {
    console.warn(`
⚠️  prisma db push wants destructive changes (often legacy chat_* tables on the platform DB).

Chat history now lives in each user's **private database** (Settings), not platform Postgres.
Do NOT run db push --accept-data-loss on production without a backup.

Running safe additive SQL patches instead…
`);
    if (!run("npm run db:sync", { allowFail: true })) {
      console.error(`
❌ Safe sync failed. Manual options:
  1. Fresh install: use an empty platform database
  2. Upgrade: npm run db:sync  then npm run db:verify
  3. See docs/troubleshooting.md#database-setup
`);
      return false;
    }
    console.log("✅ Safe additive patches applied. Run npm run db:verify to confirm.");
    return true;
  }

  console.error(push.output);
  return false;
}

async function main() {
  console.log("\n🌿 AYRA Agent — Setup\n");

  const envPath = resolve(process.cwd(), ".env");
  const examplePath = resolve(process.cwd(), ".env.example");

  if (!existsSync(envPath)) {
    if (existsSync(examplePath)) {
      copyFileSync(examplePath, envPath);
      console.log("📄 Created .env from .env.example — edit DATABASE_URL and secrets, then re-run npm run setup");
    } else {
      console.error("❌ No .env file. Copy .env.example to .env and configure it.");
    }
    process.exit(1);
  }

  loadDotEnv();

  if (!requireEnv(["DATABASE_URL"])) {
    console.log("\n→ Edit .env with your platform Postgres URL, then run npm run setup again.\n");
    process.exit(1);
  }

  if (!process.env.NEXTAUTH_SECRET?.trim()) {
    console.warn("⚠️  NEXTAUTH_SECRET is empty — generate with: openssl rand -base64 32");
  }
  if (!process.env.ENCRYPTION_KEY?.trim()) {
    console.warn("⚠️  ENCRYPTION_KEY is empty — generate with: openssl rand -hex 32 (required in production)");
  }

  if (!run("npx prisma generate")) {
    process.exit(1);
  }

  if (!(await syncDatabase())) {
    process.exit(1);
  }

  if (!run("npm run prisma:seed", { allowFail: true })) {
    console.warn("⚠️  Skill seed failed — you can retry with npm run prisma:seed");
  }

  if (process.env.AYRA_SKIP_PYTHON_SETUP === "true") {
    console.log("\n⏭️  Skipping Python setup (AYRA_SKIP_PYTHON_SETUP=true)");
  } else if (!run("npm run python:setup", { allowFail: true })) {
    console.warn(`
⚠️  Python runtime setup failed (optional for web chat; required for cron/blueprints).
   Install Python 3.9+ or set AYRA_PYTHON_BIN in .env, then: npm run python:setup
   Or skip: AYRA_SKIP_PYTHON_SETUP=true npm run setup
`);
  }

  console.log(`
✅ Setup complete.

Next steps:
  1. npm run db:verify     — confirm platform DB
  2. npm run dev           — web app (terminal 1)
  3. npm run worker        — Telegram + cron (terminal 2)
  4. Open http://localhost:3000/register

Docs: /docs/getting-started · /docs/slash-commands
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
