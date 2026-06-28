#!/usr/bin/env tsx
/**
 * Apply additive schema patches without destructive db push.
 * Usage: npm run db:sync
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

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

const SAFE_MIGRATIONS = [
  "20250622120000_add_agent_image_model/migration.sql",
  "20250622130000_add_user_default_image_model/migration.sql",
  "20250622150000_add_llm_base_url/migration.sql",
  "20250622170000_chat_model_thinking/migration.sql",
  "20250622180000_chat_pinned/migration.sql",
  "20250622_meme_alerts/migration.sql",
  "20250622_telegram_dedup/migration.sql",
  "20250622200000_brain_tasks/migration.sql",
  "20250622210000_brain_tasks_to_sqlite/migration.sql",
  "20250622220000_user_brain_database_url/migration.sql",
  "20250622240000_user_fallback_agentmemory/migration.sql",
  "20250622250000_user_fallback_rpc_urls/migration.sql",
  "20250622260000_custom_models_encrypted_secrets/migration.sql",
  "20250622270000_user_fallback_image_models/migration.sql",
  "20250622280000_agent_run_usage_tokens/migration.sql",
];

async function main() {
  console.log("\n🔄 AYRA — Safe DB sync\n");

  for (const rel of SAFE_MIGRATIONS) {
    const file = resolve(process.cwd(), "prisma/migrations", rel);
    if (!existsSync(file)) {
      console.warn(`⚠️  Skip missing: ${rel}`);
      continue;
    }
    console.log(`→ Applying ${rel}`);
    try {
      execSync(`npx prisma db execute --file "${file}"`, {
        stdio: "inherit",
        env: process.env,
      });
    } catch {
      console.warn(`⚠️  Skipped or already applied: ${rel}`);
    }
  }

  console.log("\n✅ Safe sync complete.");
  console.log("→ Verify: npm run db:verify");
  console.log("→ Check auth: npm run auth:check");
  console.log("\nNote: `prisma migrate deploy` fails with P3005 on existing DBs.");
  console.log("Use this script instead of `db push --accept-data-loss`.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
