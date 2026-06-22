-- Per-user private Postgres for AYRA Brain (encrypted URL on User row)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "brainDatabaseUrl" TEXT;
