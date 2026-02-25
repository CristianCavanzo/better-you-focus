-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BlockStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MotivationCategory" AS ENUM ('DISCIPLINA', 'PROPOSITO_FINANCIERO', 'INDEPENDENCIA_EMOCIONAL', 'CRECIMIENTO_PROFESIONAL');

-- CreateEnum
CREATE TYPE "RitualStepType" AS ENUM ('BREATHING', 'VISUALIZATION', 'IF_THEN', 'CUSTOM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "selectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "categoryId" TEXT NOT NULL,
    "status" "BlockStatus" NOT NULL DEFAULT 'ACTIVE',
    "plannedSeconds" INTEGER NOT NULL,
    "actualSeconds" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "allSelectedCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FocusBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FocusBlockSelection" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "FocusBlockSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PanicEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT,
    "urge" INTEGER,
    "emotion" TEXT,
    "chosenAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PanicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "urge" INTEGER,
    "emotion" TEXT,
    "energy" INTEGER,
    "valueActionDone" BOOLEAN NOT NULL DEFAULT false,
    "nextStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotivationPhrase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "MotivationCategory" NOT NULL,
    "text" TEXT NOT NULL,
    "ifThen" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotivationPhrase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ritual" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ritual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RitualStep" (
    "id" TEXT NOT NULL,
    "ritualId" TEXT NOT NULL,
    "type" "RitualStepType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "seconds" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RitualStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE INDEX "Task_categoryId_status_sortOrder_idx" ON "Task"("categoryId", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE INDEX "FocusBlock_categoryId_startedAt_idx" ON "FocusBlock"("categoryId", "startedAt");

-- CreateIndex
CREATE INDEX "FocusBlock_userId_idx" ON "FocusBlock"("userId");

-- CreateIndex
CREATE INDEX "FocusBlockSelection_blockId_sortOrder_idx" ON "FocusBlockSelection"("blockId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FocusBlockSelection_blockId_taskId_key" ON "FocusBlockSelection"("blockId", "taskId");

-- CreateIndex
CREATE INDEX "PanicEvent_userId_createdAt_idx" ON "PanicEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PanicEvent_categoryId_idx" ON "PanicEvent"("categoryId");

-- CreateIndex
CREATE INDEX "DailyLog_userId_createdAt_idx" ON "DailyLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_dateKey_key" ON "DailyLog"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "MotivationPhrase_userId_category_active_idx" ON "MotivationPhrase"("userId", "category", "active");

-- CreateIndex
CREATE INDEX "Ritual_userId_isActive_idx" ON "Ritual"("userId", "isActive");

-- CreateIndex
CREATE INDEX "RitualStep_ritualId_sortOrder_idx" ON "RitualStep"("ritualId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusBlock" ADD CONSTRAINT "FocusBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusBlock" ADD CONSTRAINT "FocusBlock_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusBlockSelection" ADD CONSTRAINT "FocusBlockSelection_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "FocusBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusBlockSelection" ADD CONSTRAINT "FocusBlockSelection_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanicEvent" ADD CONSTRAINT "PanicEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PanicEvent" ADD CONSTRAINT "PanicEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotivationPhrase" ADD CONSTRAINT "MotivationPhrase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ritual" ADD CONSTRAINT "Ritual_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RitualStep" ADD CONSTRAINT "RitualStep_ritualId_fkey" FOREIGN KEY ("ritualId") REFERENCES "Ritual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
