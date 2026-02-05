-- Mode 3 (Actions): Add task tracking fields to tasks table
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "task_progress" JSONB;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completed_value" DECIMAL(15, 2);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignee_role" TEXT;

-- Mode 4 (Evidence): Add evidence categorization fields to data_room_documents table
ALTER TABLE "data_room_documents" ADD COLUMN IF NOT EXISTS "evidence_category" TEXT;
ALTER TABLE "data_room_documents" ADD COLUMN IF NOT EXISTS "expected_document_id" TEXT;
ALTER TABLE "data_room_documents" ADD COLUMN IF NOT EXISTS "evidence_source" TEXT;

-- Mode 5 (Deal Room): Add activation timestamp to companies table
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "deal_room_activated_at" TIMESTAMP(3);
