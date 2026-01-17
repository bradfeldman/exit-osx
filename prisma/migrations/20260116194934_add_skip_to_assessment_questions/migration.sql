-- AlterTable
ALTER TABLE "project_assessment_questions" ADD COLUMN     "skipped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "skipped_at" TIMESTAMP(3);
