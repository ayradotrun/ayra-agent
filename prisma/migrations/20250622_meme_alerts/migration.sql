-- Meme alerts + Telegram poll offset dedup
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "memeAlertsEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "MemeAlertSent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mint" TEXT NOT NULL,
    "symbol" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemeAlertSent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TelegramBotOffset" (
    "id" TEXT NOT NULL,
    "lastUpdateId" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TelegramBotOffset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MemeAlertSent_userId_mint_key" ON "MemeAlertSent"("userId", "mint");
CREATE INDEX IF NOT EXISTS "MemeAlertSent_userId_createdAt_idx" ON "MemeAlertSent"("userId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "MemeAlertSent" ADD CONSTRAINT "MemeAlertSent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
