-- CreateEnum
CREATE TYPE "BrainTaskType" AS ENUM ('TWEET', 'CALENDAR', 'REMINDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BrainTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BrainTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" "BrainTaskType" NOT NULL,
    "status" "BrainTaskStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "result" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrainTask_userId_status_scheduledAt_idx" ON "BrainTask"("userId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "BrainTask_agentId_status_scheduledAt_idx" ON "BrainTask"("agentId", "status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "BrainTask" ADD CONSTRAINT "BrainTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainTask" ADD CONSTRAINT "BrainTask_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
