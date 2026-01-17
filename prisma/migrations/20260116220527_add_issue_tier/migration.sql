-- CreateEnum
CREATE TYPE "IssueTier" AS ENUM ('CRITICAL', 'SIGNIFICANT', 'OPTIMIZATION');

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "issue_tier" "IssueTier" NOT NULL DEFAULT 'OPTIMIZATION';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "issue_tier" "IssueTier";

-- CreateIndex
CREATE INDEX "questions_issue_tier_idx" ON "questions"("issue_tier");
