-- Widen Decimal(4,2) multiple fields to Decimal(6,2) to prevent overflow
-- Decimal(4,2) maxes at 99.99 which is too small for DCF-implied multiples (can exceed 100x)
-- Decimal(6,2) supports up to 9999.99 which is more than sufficient

-- ValuationSnapshot fields
ALTER TABLE "valuation_snapshots" ALTER COLUMN "industry_multiple_low" TYPE DECIMAL(6,2);
ALTER TABLE "valuation_snapshots" ALTER COLUMN "industry_multiple_high" TYPE DECIMAL(6,2);
ALTER TABLE "valuation_snapshots" ALTER COLUMN "base_multiple" TYPE DECIMAL(6,2);
ALTER TABLE "valuation_snapshots" ALTER COLUMN "final_multiple" TYPE DECIMAL(6,2);
ALTER TABLE "valuation_snapshots" ALTER COLUMN "alpha_constant" TYPE DECIMAL(6,2);
ALTER TABLE "valuation_snapshots" ALTER COLUMN "dcf_implied_multiple" TYPE DECIMAL(6,2);

-- IndustryMultiple fields
ALTER TABLE "industry_multiples" ALTER COLUMN "revenue_multiple_low" TYPE DECIMAL(6,2);
ALTER TABLE "industry_multiples" ALTER COLUMN "revenue_multiple_high" TYPE DECIMAL(6,2);
ALTER TABLE "industry_multiples" ALTER COLUMN "ebitda_multiple_low" TYPE DECIMAL(6,2);
ALTER TABLE "industry_multiples" ALTER COLUMN "ebitda_multiple_high" TYPE DECIMAL(6,2);

-- DCFAssumptions fields
ALTER TABLE "dcf_assumptions" ALTER COLUMN "beta" TYPE DECIMAL(6,2);
ALTER TABLE "dcf_assumptions" ALTER COLUMN "exit_multiple" TYPE DECIMAL(6,2);
ALTER TABLE "dcf_assumptions" ALTER COLUMN "ebitda_multiple_low_override" TYPE DECIMAL(6,2);
ALTER TABLE "dcf_assumptions" ALTER COLUMN "ebitda_multiple_high_override" TYPE DECIMAL(6,2);
