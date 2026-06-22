-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "chatModel" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "deepThinking" BOOLEAN NOT NULL DEFAULT false;
