-- CreateEnum
CREATE TYPE "DiagnosisSubcategory" AS ENUM ('SCALABILITY', 'TECHNOLOGY', 'VENDOR', 'RETENTION');

-- CreateEnum
CREATE TYPE "WeeklyProgressStatus" AS ENUM ('DIAGNOSTIC', 'TASKS', 'REASSESSMENT', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OperationsTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "SignalChannel" AS ENUM ('PROMPTED_DISCLOSURE', 'TASK_GENERATED', 'TIME_DECAY', 'EXTERNAL', 'ADVISOR');

-- CreateEnum
CREATE TYPE "SignalSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "SignalResolutionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LedgerEventType" AS ENUM ('TASK_COMPLETED', 'REGRESSION_DETECTED', 'BENCHMARK_SHIFT', 'NEW_DATA_CONNECTED', 'SIGNAL_CONFIRMED', 'DRIFT_DETECTED', 'ASSESSMENT_COMPLETED', 'SNAPSHOT_CREATED');

-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'PARTNER_NUDGE';

-- CreateTable
CREATE TABLE "company_visit_logs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bri_score" DOUBLE PRECISION,
    "valuation" DOUBLE PRECISION,
    "tasks_completed" INTEGER NOT NULL DEFAULT 0,
    "critical_tasks_completed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "company_visit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_diagnostic_questions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "subcategory" "DiagnosisSubcategory" NOT NULL,
    "questions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_diagnostic_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_diagnostic_responses" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "question_set_id" TEXT NOT NULL,
    "subcategory" "DiagnosisSubcategory" NOT NULL,
    "responses" JSONB NOT NULL,
    "identified_drivers" JSONB,
    "score_before" INTEGER,
    "score_after" INTEGER,
    "is_reassessment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_diagnostic_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_operations_tasks" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "subcategory" "DiagnosisSubcategory" NOT NULL,
    "week_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "done_definition" TEXT NOT NULL,
    "benchmark_target" TEXT,
    "delegate_to" TEXT,
    "estimated_effort" TEXT,
    "why_this_matters" TEXT,
    "improves_drivers" TEXT[],
    "status" "OperationsTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completed_at" TIMESTAMP(3),
    "completion_notes" TEXT,
    "hit_benchmark" BOOLEAN,
    "na_reason" TEXT,
    "display_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_operations_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_weekly_progress" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "subcategory" "DiagnosisSubcategory" NOT NULL,
    "diagnostic_started_at" TIMESTAMP(3),
    "diagnostic_completed_at" TIMESTAMP(3),
    "tasks_generated_at" TIMESTAMP(3),
    "tasks_completed_at" TIMESTAMP(3),
    "reassessment_completed_at" TIMESTAMP(3),
    "score_before" INTEGER,
    "score_after" INTEGER,
    "value_unlocked" DECIMAL(10,2),
    "status" "WeeklyProgressStatus" NOT NULL DEFAULT 'DIAGNOSTIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_weekly_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "channel" "SignalChannel" NOT NULL,
    "category" "BriCategory",
    "event_type" TEXT NOT NULL,
    "severity" "SignalSeverity" NOT NULL DEFAULT 'MEDIUM',
    "confidence" "ConfidenceLevel" NOT NULL DEFAULT 'UNCERTAIN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "raw_data" JSONB,
    "user_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by_user_id" TEXT,
    "resolution_status" "SignalResolutionStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "resolution_notes" TEXT,
    "estimated_value_impact" DECIMAL(15,2),
    "estimated_bri_impact" DECIMAL(5,4),
    "source_type" TEXT,
    "source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "value_ledger_entries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "event_type" "LedgerEventType" NOT NULL,
    "category" "BriCategory",
    "delta_value_recovered" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "delta_value_at_risk" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "delta_bri" DECIMAL(5,4),
    "bri_score_before" DECIMAL(5,4),
    "bri_score_after" DECIMAL(5,4),
    "valuation_before" DECIMAL(15,2),
    "valuation_after" DECIMAL(15,2),
    "confidence_level" "ConfidenceLevel" NOT NULL DEFAULT 'SOMEWHAT_CONFIDENT',
    "narrative_summary" TEXT NOT NULL,
    "signal_id" TEXT,
    "task_id" TEXT,
    "snapshot_id" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "value_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disclosure_prompt_sets" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "questions" JSONB NOT NULL,
    "completed_at" TIMESTAMP(3),
    "skipped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disclosure_prompt_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disclosure_responses" (
    "id" TEXT NOT NULL,
    "prompt_set_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "bri_category" "BriCategory" NOT NULL,
    "answer" BOOLEAN NOT NULL,
    "follow_up_answer" TEXT,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signal_created" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "disclosure_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_check_ins" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "week_of" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "task_status" TEXT,
    "team_changes" BOOLEAN,
    "team_changes_note" TEXT,
    "customer_changes" BOOLEAN,
    "customer_changes_note" TEXT,
    "confidence_rating" INTEGER,
    "additional_notes" TEXT,
    "completed_at" TIMESTAMP(3),
    "skipped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_signal_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "state" TEXT,
    "api_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "last_checked" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_signal_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accountability_partners" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "invite_token" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "invited_by_user_id" TEXT NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "last_nudge_at" TIMESTAMP(3),
    "last_email_sent_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accountability_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_visit_logs_company_id_user_id_visited_at_idx" ON "company_visit_logs"("company_id", "user_id", "visited_at" DESC);

-- CreateIndex
CREATE INDEX "company_diagnostic_questions_company_id_idx" ON "company_diagnostic_questions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_diagnostic_questions_company_id_subcategory_key" ON "company_diagnostic_questions"("company_id", "subcategory");

-- CreateIndex
CREATE INDEX "company_diagnostic_responses_company_id_idx" ON "company_diagnostic_responses"("company_id");

-- CreateIndex
CREATE INDEX "company_diagnostic_responses_question_set_id_idx" ON "company_diagnostic_responses"("question_set_id");

-- CreateIndex
CREATE INDEX "company_operations_tasks_company_id_week_number_idx" ON "company_operations_tasks"("company_id", "week_number");

-- CreateIndex
CREATE INDEX "company_operations_tasks_company_id_subcategory_idx" ON "company_operations_tasks"("company_id", "subcategory");

-- CreateIndex
CREATE INDEX "company_weekly_progress_company_id_idx" ON "company_weekly_progress"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_weekly_progress_company_id_week_number_key" ON "company_weekly_progress"("company_id", "week_number");

-- CreateIndex
CREATE INDEX "signals_company_id_created_at_idx" ON "signals"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "signals_company_id_resolution_status_idx" ON "signals"("company_id", "resolution_status");

-- CreateIndex
CREATE INDEX "signals_company_id_channel_idx" ON "signals"("company_id", "channel");

-- CreateIndex
CREATE INDEX "signals_company_id_severity_idx" ON "signals"("company_id", "severity");

-- CreateIndex
CREATE INDEX "value_ledger_entries_company_id_occurred_at_idx" ON "value_ledger_entries"("company_id", "occurred_at");

-- CreateIndex
CREATE INDEX "value_ledger_entries_company_id_event_type_idx" ON "value_ledger_entries"("company_id", "event_type");

-- CreateIndex
CREATE INDEX "value_ledger_entries_signal_id_idx" ON "value_ledger_entries"("signal_id");

-- CreateIndex
CREATE INDEX "value_ledger_entries_task_id_idx" ON "value_ledger_entries"("task_id");

-- CreateIndex
CREATE INDEX "disclosure_prompt_sets_company_id_scheduled_for_idx" ON "disclosure_prompt_sets"("company_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "disclosure_responses_prompt_set_id_idx" ON "disclosure_responses"("prompt_set_id");

-- CreateIndex
CREATE INDEX "disclosure_responses_company_id_idx" ON "disclosure_responses"("company_id");

-- CreateIndex
CREATE INDEX "weekly_check_ins_company_id_week_of_idx" ON "weekly_check_ins"("company_id", "week_of");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_check_ins_company_id_week_of_key" ON "weekly_check_ins"("company_id", "week_of");

-- CreateIndex
CREATE UNIQUE INDEX "accountability_partners_company_id_key" ON "accountability_partners"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "accountability_partners_invite_token_key" ON "accountability_partners"("invite_token");

-- CreateIndex
CREATE UNIQUE INDEX "accountability_partners_access_token_key" ON "accountability_partners"("access_token");

-- CreateIndex
CREATE INDEX "accountability_partners_access_token_idx" ON "accountability_partners"("access_token");

-- CreateIndex
CREATE INDEX "accountability_partners_invite_token_idx" ON "accountability_partners"("invite_token");

-- AddForeignKey
ALTER TABLE "company_diagnostic_questions" ADD CONSTRAINT "company_diagnostic_questions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_diagnostic_responses" ADD CONSTRAINT "company_diagnostic_responses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_diagnostic_responses" ADD CONSTRAINT "company_diagnostic_responses_question_set_id_fkey" FOREIGN KEY ("question_set_id") REFERENCES "company_diagnostic_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_operations_tasks" ADD CONSTRAINT "company_operations_tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_weekly_progress" ADD CONSTRAINT "company_weekly_progress_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_confirmed_by_user_id_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_ledger_entries" ADD CONSTRAINT "value_ledger_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_ledger_entries" ADD CONSTRAINT "value_ledger_entries_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "signals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "value_ledger_entries" ADD CONSTRAINT "value_ledger_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_prompt_sets" ADD CONSTRAINT "disclosure_prompt_sets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disclosure_responses" ADD CONSTRAINT "disclosure_responses_prompt_set_id_fkey" FOREIGN KEY ("prompt_set_id") REFERENCES "disclosure_prompt_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_check_ins" ADD CONSTRAINT "weekly_check_ins_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountability_partners" ADD CONSTRAINT "accountability_partners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accountability_partners" ADD CONSTRAINT "accountability_partners_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

