-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('ANNUAL', 'QUARTERLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "Quarter" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- AlterTable
ALTER TABLE "ebitda_adjustments" ADD COLUMN     "period_id" TEXT;

-- CreateTable
CREATE TABLE "financial_periods" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "quarter" "Quarter",
    "month" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_statements" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "gross_revenue" DECIMAL(15,2) NOT NULL,
    "cogs" DECIMAL(15,2) NOT NULL,
    "operating_expenses" DECIMAL(15,2) NOT NULL,
    "gross_profit" DECIMAL(15,2) NOT NULL,
    "gross_margin_pct" DECIMAL(5,4) NOT NULL,
    "ebitda" DECIMAL(15,2) NOT NULL,
    "ebitda_margin_pct" DECIMAL(5,4) NOT NULL,
    "depreciation" DECIMAL(15,2),
    "amortization" DECIMAL(15,2),
    "interest_expense" DECIMAL(15,2),
    "tax_expense" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_sheets" (
    "id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "cash" DECIMAL(15,2) NOT NULL,
    "accounts_receivable" DECIMAL(15,2) NOT NULL,
    "inventory" DECIMAL(15,2) NOT NULL,
    "prepaid_expenses" DECIMAL(15,2) NOT NULL,
    "other_current_assets" DECIMAL(15,2) NOT NULL,
    "ppe_gross" DECIMAL(15,2) NOT NULL,
    "accumulated_depreciation" DECIMAL(15,2) NOT NULL,
    "intangible_assets" DECIMAL(15,2) NOT NULL,
    "other_long_term_assets" DECIMAL(15,2) NOT NULL,
    "accounts_payable" DECIMAL(15,2) NOT NULL,
    "accrued_expenses" DECIMAL(15,2) NOT NULL,
    "current_portion_ltd" DECIMAL(15,2) NOT NULL,
    "other_current_liabilities" DECIMAL(15,2) NOT NULL,
    "long_term_debt" DECIMAL(15,2) NOT NULL,
    "deferred_tax_liabilities" DECIMAL(15,2) NOT NULL,
    "other_long_term_liabilities" DECIMAL(15,2) NOT NULL,
    "retained_earnings" DECIMAL(15,2) NOT NULL,
    "owners_equity" DECIMAL(15,2) NOT NULL,
    "total_current_assets" DECIMAL(15,2) NOT NULL,
    "total_long_term_assets" DECIMAL(15,2) NOT NULL,
    "total_assets" DECIMAL(15,2) NOT NULL,
    "total_current_liabilities" DECIMAL(15,2) NOT NULL,
    "total_long_term_liabilities" DECIMAL(15,2) NOT NULL,
    "total_liabilities" DECIMAL(15,2) NOT NULL,
    "total_equity" DECIMAL(15,2) NOT NULL,
    "working_capital" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "financial_periods_company_id_fiscal_year_idx" ON "financial_periods"("company_id", "fiscal_year");

-- CreateIndex
CREATE UNIQUE INDEX "financial_periods_company_id_fiscal_year_period_type_quarte_key" ON "financial_periods"("company_id", "fiscal_year", "period_type", "quarter", "month");

-- CreateIndex
CREATE UNIQUE INDEX "income_statements_period_id_key" ON "income_statements"("period_id");

-- CreateIndex
CREATE UNIQUE INDEX "balance_sheets_period_id_key" ON "balance_sheets"("period_id");

-- CreateIndex
CREATE INDEX "ebitda_adjustments_company_id_period_id_idx" ON "ebitda_adjustments"("company_id", "period_id");

-- AddForeignKey
ALTER TABLE "ebitda_adjustments" ADD CONSTRAINT "ebitda_adjustments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "financial_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_statements" ADD CONSTRAINT "income_statements_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "financial_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_sheets" ADD CONSTRAINT "balance_sheets_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "financial_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;
