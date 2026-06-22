-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- DropIndex
DROP INDEX IF EXISTS "ChatSession_userId_updatedAt_idx";

-- CreateIndex
CREATE INDEX "ChatSession_userId_pinned_updatedAt_idx" ON "ChatSession"("userId", "pinned", "updatedAt");
