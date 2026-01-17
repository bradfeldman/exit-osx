-- CreateEnum
CREATE TYPE "QuestionImpact" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "BuyerSensitivity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "StrategyType" AS ENUM ('FULL_FIX', 'PARTIAL_MITIGATION', 'RISK_ACCEPTANCE');

-- CreateEnum
CREATE TYPE "OwnerRole" AS ENUM ('FOUNDER', 'CFO_FINANCE', 'OPS_LEADER', 'SALES_MKTG', 'HR_PEOPLE', 'LEGAL_COMPLIANCE', 'IT_SECURITY', 'ADVISOR');

-- CreateEnum
CREATE TYPE "Timebox" AS ENUM ('IMMEDIATE_0_30', 'NEAR_30_90', 'LONG_90_365');

-- CreateEnum
CREATE TYPE "ProjectAssessmentStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "project_questions" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "bri_category" "BriCategory" NOT NULL,
    "sub_category" TEXT NOT NULL,
    "question_impact" "QuestionImpact" NOT NULL,
    "buyer_sensitivity" "BuyerSensitivity" NOT NULL,
    "definition_note" TEXT,
    "help_text" TEXT,
    "risk_definition" TEXT,
    "primary_value_lever" TEXT,
    "related_question_ids" TEXT[],
    "related_modules" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "score_value" DECIMAL(3,2) NOT NULL,
    "buyer_interpretation" TEXT,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "project_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_strategies" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "strategy_name" TEXT NOT NULL,
    "strategy_description" TEXT,
    "strategy_type" "StrategyType" NOT NULL,
    "upgrade_from_score" DECIMAL(3,2) NOT NULL,
    "max_score_achievable" DECIMAL(3,2) NOT NULL,
    "estimated_effort" TEXT NOT NULL,
    "estimated_timeline" TEXT,
    "applicable_when" TEXT,

    CONSTRAINT "project_strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_task_templates" (
    "id" TEXT NOT NULL,
    "strategy_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "primary_verb" TEXT NOT NULL,
    "verb_tier" INTEGER NOT NULL,
    "object" TEXT NOT NULL,
    "outcome" TEXT,
    "owner_role" "OwnerRole" NOT NULL,
    "timebox" "Timebox" NOT NULL,
    "effort_level" "EffortLevel" NOT NULL,
    "complexity" "ComplexityLevel" NOT NULL,
    "estimated_hours" INTEGER,
    "deliverables" TEXT[],
    "evidence" TEXT[],
    "risk_category" "BriCategory" NOT NULL,
    "dependencies" TEXT[],
    "blocked_by" TEXT[],
    "upgrades_from_score" DECIMAL(3,2),
    "upgrades_to_score" DECIMAL(3,2),
    "upgrades_from_option_id" TEXT,
    "upgrades_to_option_id" TEXT,
    "defer_reason_code" TEXT,
    "companion_verbs" TEXT[],
    "re_evaluation_date" TEXT,
    "value_impact_state" TEXT,
    "mitigation_summary" TEXT,

    CONSTRAINT "project_task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assessments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assessment_number" INTEGER NOT NULL,
    "primary_category" "BriCategory",
    "title" TEXT,
    "status" "ProjectAssessmentStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "bri_score_before" DECIMAL(5,4),
    "bri_score_after" DECIMAL(5,4),
    "score_impact" DECIMAL(5,4),
    "action_plan_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assessment_questions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "selection_reason" TEXT,
    "priority_score" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "project_assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assessment_responses" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_option_id" TEXT NOT NULL,
    "effective_option_id" TEXT,
    "estimated_score" DECIMAL(3,2),
    "actual_score" DECIMAL(3,2) NOT NULL,
    "score_impact" DECIMAL(4,3),
    "confidence_level" "ConfidenceLevel" NOT NULL,
    "notes" TEXT,
    "evidence_urls" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_question_priorities" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "impact_score" DECIMAL(5,2) NOT NULL,
    "relevance_score" DECIMAL(5,2) NOT NULL,
    "urgency_score" DECIMAL(5,2) NOT NULL,
    "priority_score" DECIMAL(5,2) NOT NULL,
    "has_been_asked" BOOLEAN NOT NULL DEFAULT false,
    "asked_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_question_priorities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_questions_module_id_key" ON "project_questions"("module_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_questions_question_id_key" ON "project_questions"("question_id");

-- CreateIndex
CREATE INDEX "project_questions_bri_category_question_impact_idx" ON "project_questions"("bri_category", "question_impact");

-- CreateIndex
CREATE UNIQUE INDEX "project_question_options_question_id_option_id_key" ON "project_question_options"("question_id", "option_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_strategies_question_id_strategy_id_key" ON "project_strategies"("question_id", "strategy_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_task_templates_strategy_id_task_id_key" ON "project_task_templates"("strategy_id", "task_id");

-- CreateIndex
CREATE INDEX "project_assessments_company_id_status_idx" ON "project_assessments"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_assessments_company_id_assessment_number_key" ON "project_assessments"("company_id", "assessment_number");

-- CreateIndex
CREATE UNIQUE INDEX "project_assessment_questions_assessment_id_question_id_key" ON "project_assessment_questions"("assessment_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_assessment_responses_assessment_id_question_id_key" ON "project_assessment_responses"("assessment_id", "question_id");

-- CreateIndex
CREATE INDEX "company_question_priorities_company_id_priority_score_idx" ON "company_question_priorities"("company_id", "priority_score");

-- CreateIndex
CREATE UNIQUE INDEX "company_question_priorities_company_id_question_id_key" ON "company_question_priorities"("company_id", "question_id");

-- AddForeignKey
ALTER TABLE "project_question_options" ADD CONSTRAINT "project_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "project_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_strategies" ADD CONSTRAINT "project_strategies_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "project_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_templates" ADD CONSTRAINT "project_task_templates_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "project_strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_templates" ADD CONSTRAINT "project_task_templates_upgrades_from_option_id_fkey" FOREIGN KEY ("upgrades_from_option_id") REFERENCES "project_question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_task_templates" ADD CONSTRAINT "project_task_templates_upgrades_to_option_id_fkey" FOREIGN KEY ("upgrades_to_option_id") REFERENCES "project_question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assessments" ADD CONSTRAINT "project_assessments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assessment_questions" ADD CONSTRAINT "project_assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "project_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assessment_questions" ADD CONSTRAINT "project_assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "project_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assessment_responses" ADD CONSTRAINT "project_assessment_responses_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "project_assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assessment_responses" ADD CONSTRAINT "project_assessment_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "project_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assessment_responses" ADD CONSTRAINT "project_assessment_responses_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "project_question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assessment_responses" ADD CONSTRAINT "project_assessment_responses_effective_option_id_fkey" FOREIGN KEY ("effective_option_id") REFERENCES "project_question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_question_priorities" ADD CONSTRAINT "company_question_priorities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_question_priorities" ADD CONSTRAINT "company_question_priorities_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "project_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
