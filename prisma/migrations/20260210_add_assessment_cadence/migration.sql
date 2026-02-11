-- PROD-017: Assessment Cadence Control (Fatigue Prevention)
-- Adds cadence preference and prompt tracking to companies table

-- AlterTable
ALTER TABLE "companies" ADD COLUMN "assessment_cadence" TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE "companies" ADD COLUMN "cadence_prompts_shown_at" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[];
