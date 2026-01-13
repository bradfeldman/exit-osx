-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "RevenueSizeCategory" AS ENUM ('UNDER_500K', 'FROM_500K_TO_1M', 'FROM_1M_TO_3M', 'FROM_3M_TO_10M', 'FROM_10M_TO_25M', 'OVER_25M');

-- CreateEnum
CREATE TYPE "RevenueModelType" AS ENUM ('PROJECT_BASED', 'TRANSACTIONAL', 'RECURRING_CONTRACTS', 'SUBSCRIPTION_SAAS');

-- CreateEnum
CREATE TYPE "GrossMarginCategory" AS ENUM ('LOW', 'MODERATE', 'GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "LaborIntensityLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "AssetIntensityLevel" AS ENUM ('ASSET_LIGHT', 'MODERATE', 'ASSET_HEAVY');

-- CreateEnum
CREATE TYPE "OwnerInvolvementLevel" AS ENUM ('MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('UNCERTAIN', 'SOMEWHAT_CONFIDENT', 'CONFIDENT', 'VERIFIED');

-- CreateEnum
CREATE TYPE "BriCategory" AS ENUM ('FINANCIAL', 'TRANSFERABILITY', 'OPERATIONAL', 'MARKET', 'LEGAL_TAX', 'PERSONAL');

-- CreateEnum
CREATE TYPE "ActionItemType" AS ENUM ('TYPE_I_EVIDENCE', 'TYPE_II_DOCUMENTATION', 'TYPE_III_OPERATIONAL', 'TYPE_IV_INSTITUTIONALIZE', 'TYPE_V_RISK_REDUCTION', 'TYPE_VI_ALIGNMENT', 'TYPE_VII_READINESS', 'TYPE_VIII_SIGNALING', 'TYPE_IX_OPTIONS', 'TYPE_X_DEFER');

-- CreateEnum
CREATE TYPE "EffortLevel" AS ENUM ('MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'MAJOR');

-- CreateEnum
CREATE TYPE "ComplexityLevel" AS ENUM ('SIMPLE', 'MODERATE', 'COMPLEX', 'STRATEGIC');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'DEFERRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SprintPriority" AS ENUM ('BIG_ROCK', 'SAND', 'WATER');

-- CreateEnum
CREATE TYPE "SprintStatus" AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('INITIAL', 'QUARTERLY_CHECK_IN', 'AD_HOC');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "auth_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icb_industry" TEXT NOT NULL,
    "icb_super_sector" TEXT NOT NULL,
    "icb_sector" TEXT NOT NULL,
    "icb_sub_sector" TEXT NOT NULL,
    "annual_revenue" DECIMAL(15,2) NOT NULL,
    "annual_ebitda" DECIMAL(15,2) NOT NULL,
    "owner_compensation" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ebitda_adjustments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ebitda_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_factors" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "revenue_size_category" "RevenueSizeCategory" NOT NULL,
    "revenue_model" "RevenueModelType" NOT NULL,
    "gross_margin_proxy" "GrossMarginCategory" NOT NULL,
    "labor_intensity" "LaborIntensityLevel" NOT NULL,
    "asset_intensity" "AssetIntensityLevel" NOT NULL,
    "owner_involvement" "OwnerInvolvementLevel" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "bri_category" "BriCategory" NOT NULL,
    "question_text" TEXT NOT NULL,
    "help_text" TEXT,
    "display_order" INTEGER NOT NULL,
    "max_impact_points" DECIMAL(5,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "option_text" TEXT NOT NULL,
    "score_value" DECIMAL(3,2) NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_responses" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_option_id" TEXT NOT NULL,
    "confidence_level" "ConfidenceLevel" NOT NULL,
    "notes" TEXT,
    "evidence_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "evidence_urls" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuation_snapshots" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "adjusted_ebitda" DECIMAL(15,2) NOT NULL,
    "industry_multiple_low" DECIMAL(4,2) NOT NULL,
    "industry_multiple_high" DECIMAL(4,2) NOT NULL,
    "core_score" DECIMAL(5,4) NOT NULL,
    "bri_score" DECIMAL(5,4) NOT NULL,
    "bri_financial" DECIMAL(5,4) NOT NULL,
    "bri_transferability" DECIMAL(5,4) NOT NULL,
    "bri_operational" DECIMAL(5,4) NOT NULL,
    "bri_market" DECIMAL(5,4) NOT NULL,
    "bri_legal_tax" DECIMAL(5,4) NOT NULL,
    "bri_personal" DECIMAL(5,4) NOT NULL,
    "base_multiple" DECIMAL(4,2) NOT NULL,
    "discount_fraction" DECIMAL(5,4) NOT NULL,
    "final_multiple" DECIMAL(4,2) NOT NULL,
    "current_value" DECIMAL(15,2) NOT NULL,
    "potential_value" DECIMAL(15,2) NOT NULL,
    "value_gap" DECIMAL(15,2) NOT NULL,
    "alpha_constant" DECIMAL(3,2) NOT NULL DEFAULT 0.40,
    "snapshot_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valuation_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "action_type" "ActionItemType" NOT NULL,
    "bri_category" "BriCategory" NOT NULL,
    "linked_question_id" TEXT,
    "raw_impact" DECIMAL(15,2) NOT NULL,
    "normalized_value" DECIMAL(15,2) NOT NULL,
    "effort_level" "EffortLevel" NOT NULL,
    "complexity" "ComplexityLevel" NOT NULL,
    "estimated_hours" INTEGER,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "deferred_until" TIMESTAMP(3),
    "deferral_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "sprint_id" TEXT,
    "sprint_priority" "SprintPriority",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "target_value_increase" DECIMAL(15,2) NOT NULL,
    "actual_value_increase" DECIMAL(15,2),
    "status" "SprintStatus" NOT NULL DEFAULT 'PLANNING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_multiples" (
    "id" TEXT NOT NULL,
    "icb_industry" TEXT NOT NULL,
    "icb_super_sector" TEXT NOT NULL,
    "icb_sector" TEXT NOT NULL,
    "icb_sub_sector" TEXT NOT NULL,
    "revenue_multiple_low" DECIMAL(4,2) NOT NULL,
    "revenue_multiple_high" DECIMAL(4,2) NOT NULL,
    "ebitda_multiple_low" DECIMAL(4,2) NOT NULL,
    "ebitda_multiple_high" DECIMAL(4,2) NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "source" TEXT,

    CONSTRAINT "industry_multiples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_users_organization_id_user_id_key" ON "organization_users"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "core_factors_company_id_key" ON "core_factors"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_responses_assessment_id_question_id_key" ON "assessment_responses"("assessment_id", "question_id");

-- CreateIndex
CREATE INDEX "valuation_snapshots_company_id_created_at_idx" ON "valuation_snapshots"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "tasks_company_id_status_idx" ON "tasks"("company_id", "status");

-- CreateIndex
CREATE INDEX "tasks_sprint_id_idx" ON "tasks"("sprint_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_task_id_user_id_key" ON "task_assignments"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "sprints_company_id_status_idx" ON "sprints"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "industry_multiples_icb_sub_sector_effective_date_key" ON "industry_multiples"("icb_sub_sector", "effective_date");

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ebitda_adjustments" ADD CONSTRAINT "ebitda_adjustments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core_factors" ADD CONSTRAINT "core_factors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_snapshots" ADD CONSTRAINT "valuation_snapshots_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
