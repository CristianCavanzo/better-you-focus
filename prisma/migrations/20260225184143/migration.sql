-- AlterEnum
ALTER TYPE "BlockStatus" ADD VALUE 'INTERRUPTED';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "defaultSeconds" INTEGER NOT NULL DEFAULT 1500;

-- AlterTable
ALTER TABLE "FocusBlock" ADD COLUMN     "endReason" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastStateAt" TIMESTAMP(3);
