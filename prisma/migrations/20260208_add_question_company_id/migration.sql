-- Add company_id column to questions table for AI-generated per-company questions
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "company_id" TEXT;

-- Add foreign key constraint
ALTER TABLE "questions" ADD CONSTRAINT "questions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add composite index for company-scoped question lookups
CREATE INDEX IF NOT EXISTS "questions_company_id_is_active_idx" ON "questions"("company_id", "is_active");
