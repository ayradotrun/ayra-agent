ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "llmProviderId" TEXT DEFAULT 'openrouter';

CREATE TABLE IF NOT EXISTS "CustomModel" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "modelType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomModel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomModel_userId_idx" ON "CustomModel"("userId");
CREATE INDEX IF NOT EXISTS "CustomModel_userId_provider_idx" ON "CustomModel"("userId", "provider");

DO $$ BEGIN
  ALTER TABLE "CustomModel" ADD CONSTRAINT "CustomModel_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "EncryptedSecret" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "secretName" TEXT NOT NULL,
  "encryptedValue" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EncryptedSecret_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EncryptedSecret_userId_provider_secretName_key"
  ON "EncryptedSecret"("userId", "provider", "secretName");
CREATE INDEX IF NOT EXISTS "EncryptedSecret_userId_idx" ON "EncryptedSecret"("userId");

DO $$ BEGIN
  ALTER TABLE "EncryptedSecret" ADD CONSTRAINT "EncryptedSecret_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
