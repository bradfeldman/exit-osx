-- CreateTable
CREATE TABLE "drift_reports" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "bri_score_start" DECIMAL(5,4) NOT NULL,
    "bri_score_end" DECIMAL(5,4) NOT NULL,
    "valuation_start" DECIMAL(15,2) NOT NULL,
    "valuation_end" DECIMAL(15,2) NOT NULL,
    "signals_count" INTEGER NOT NULL,
    "tasks_completed_count" INTEGER NOT NULL,
    "tasks_added_count" INTEGER NOT NULL,
    "drift_categories" JSONB NOT NULL,
    "top_signals" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "email_sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drift_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drift_reports_company_id_period_end_idx" ON "drift_reports"("company_id", "period_end");

-- AddForeignKey
ALTER TABLE "drift_reports" ADD CONSTRAINT "drift_reports_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
