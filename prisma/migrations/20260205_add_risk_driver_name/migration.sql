-- Add risk_driver_name column to questions table
ALTER TABLE "questions" ADD COLUMN IF NOT EXISTS "risk_driver_name" TEXT;
