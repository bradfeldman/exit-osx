-- Add business profile fields to companies table
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "business_description" TEXT;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "business_profile" JSONB;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "profile_questions_answered" JSONB;

-- Create ai_generation_logs table
CREATE TABLE IF NOT EXISTS "ai_generation_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "generation_type" TEXT NOT NULL,
    "input_data" JSONB,
    "output_data" JSONB,
    "model_used" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "ai_generation_logs_company_id_idx" ON "ai_generation_logs"("company_id");
CREATE INDEX IF NOT EXISTS "ai_generation_logs_generation_type_idx" ON "ai_generation_logs"("generation_type");
