-- Add auto-DCF fields to valuation_snapshots
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_enterprise_value" DECIMAL(15,2);
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_equity_value" DECIMAL(15,2);
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_wacc" DECIMAL(5,4);
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_base_fcf" DECIMAL(15,2);
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_growth_rates" JSONB;
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_terminal_method" TEXT;
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_perpetual_growth_rate" DECIMAL(5,4);
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_net_debt" DECIMAL(15,2);
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_implied_multiple" DECIMAL(4,2);
ALTER TABLE "valuation_snapshots" ADD COLUMN "dcf_source" TEXT;

-- Add isManuallyConfigured to dcf_assumptions
ALTER TABLE "dcf_assumptions" ADD COLUMN "is_manually_configured" BOOLEAN NOT NULL DEFAULT false;
