-- CreateEnum
CREATE TYPE "RepeatCadence" AS ENUM ('NONE', 'DAILY', 'WEEKDAYS');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "estimateMinutes" INTEGER,
ADD COLUMN     "repeatCadence" "RepeatCadence" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "repeatTime" TEXT;

-- CreateIndex
CREATE INDEX "Task_userId_dueAt_idx" ON "Task"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "Task_userId_repeatCadence_idx" ON "Task"("userId", "repeatCadence");
