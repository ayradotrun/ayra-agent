CREATE TABLE IF NOT EXISTS "TelegramProcessedUpdate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramProcessedUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TelegramProcessedUpdate_createdAt_idx" ON "TelegramProcessedUpdate"("createdAt");
