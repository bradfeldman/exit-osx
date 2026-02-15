-- Fix alphaConstant: change default from 0.40 to 1.40 and widen column from Decimal(3,2) to Decimal(4,2)
ALTER TABLE "valuation_snapshots" ALTER COLUMN "alpha_constant" SET DEFAULT 1.40;
ALTER TABLE "valuation_snapshots" ALTER COLUMN "alpha_constant" TYPE DECIMAL(4,2);
