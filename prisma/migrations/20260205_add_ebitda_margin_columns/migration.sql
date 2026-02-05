-- Add EBITDA margin columns to industry_multiples table
-- These store typical EBITDA margin ranges for each industry,
-- providing more accurate valuations than deriving margins from multiples

ALTER TABLE "industry_multiples" ADD COLUMN IF NOT EXISTS "ebitda_margin_low" DECIMAL(5, 2);
ALTER TABLE "industry_multiples" ADD COLUMN IF NOT EXISTS "ebitda_margin_high" DECIMAL(5, 2);

-- Update existing rows with realistic industry-specific EBITDA margins
-- These are typical ranges for SMB businesses in each category

-- TECHNOLOGY - Generally higher margins
UPDATE "industry_multiples" SET "ebitda_margin_low" = 15.00, "ebitda_margin_high" = 25.00
WHERE "icb_industry" = 'TECHNOLOGY' AND "icb_sector" = 'SOFTWARE';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 12.00, "ebitda_margin_high" = 20.00
WHERE "icb_industry" = 'TECHNOLOGY' AND "icb_sector" = 'IT_SERVICES';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 8.00, "ebitda_margin_high" = 15.00
WHERE "icb_industry" = 'TECHNOLOGY' AND "icb_sector" = 'TECH_HARDWARE';

-- HEALTHCARE - Moderate to high margins
UPDATE "industry_multiples" SET "ebitda_margin_low" = 15.00, "ebitda_margin_high" = 25.00
WHERE "icb_industry" = 'HEALTHCARE' AND "icb_sector" = 'HEALTHCARE_SERVICES';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 12.00, "ebitda_margin_high" = 20.00
WHERE "icb_industry" = 'HEALTHCARE' AND "icb_sector" = 'MEDICAL_EQUIPMENT';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 18.00, "ebitda_margin_high" = 30.00
WHERE "icb_industry" = 'HEALTHCARE' AND "icb_sector" = 'PHARMACEUTICALS';

-- FINANCIALS - Higher margins for service businesses
UPDATE "industry_multiples" SET "ebitda_margin_low" = 15.00, "ebitda_margin_high" = 30.00
WHERE "icb_industry" = 'FINANCIALS';

-- CONSUMER DISCRETIONARY - Varies widely
UPDATE "industry_multiples" SET "ebitda_margin_low" = 5.00, "ebitda_margin_high" = 12.00
WHERE "icb_industry" = 'CONSUMER_DISCRETIONARY' AND "icb_sector" = 'RETAILERS';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 8.00, "ebitda_margin_high" = 15.00
WHERE "icb_industry" = 'CONSUMER_DISCRETIONARY' AND "icb_sector" = 'CONSUMER_SERVICES';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 10.00, "ebitda_margin_high" = 18.00
WHERE "icb_industry" = 'CONSUMER_DISCRETIONARY' AND "icb_sector" = 'MEDIA';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 6.00, "ebitda_margin_high" = 12.00
WHERE "icb_industry" = 'CONSUMER_DISCRETIONARY' AND "icb_sector" = 'TRAVEL_LEISURE';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 8.00, "ebitda_margin_high" = 15.00
WHERE "icb_industry" = 'CONSUMER_DISCRETIONARY' AND "icb_sector" = 'AUTOMOBILES';

-- CONSUMER STAPLES - Lower but stable margins
UPDATE "industry_multiples" SET "ebitda_margin_low" = 8.00, "ebitda_margin_high" = 15.00
WHERE "icb_industry" = 'CONSUMER_STAPLES' AND "icb_sector" = 'FOOD_BEVERAGE';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 10.00, "ebitda_margin_high" = 18.00
WHERE "icb_industry" = 'CONSUMER_STAPLES' AND "icb_sector" = 'PERSONAL_CARE';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 3.00, "ebitda_margin_high" = 8.00
WHERE "icb_industry" = 'CONSUMER_STAPLES' AND "icb_sector" = 'FOOD_RETAIL';

-- INDUSTRIALS - Moderate margins
UPDATE "industry_multiples" SET "ebitda_margin_low" = 8.00, "ebitda_margin_high" = 15.00
WHERE "icb_industry" = 'INDUSTRIALS' AND "icb_sector" = 'CONSTRUCTION';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 10.00, "ebitda_margin_high" = 18.00
WHERE "icb_industry" = 'INDUSTRIALS' AND "icb_sector" = 'INDUSTRIAL_GOODS';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 6.00, "ebitda_margin_high" = 12.00
WHERE "icb_industry" = 'INDUSTRIALS' AND "icb_sector" = 'INDUSTRIAL_SERVICES';

UPDATE "industry_multiples" SET "ebitda_margin_low" = 5.00, "ebitda_margin_high" = 10.00
WHERE "icb_industry" = 'INDUSTRIALS' AND "icb_sector" = 'TRANSPORTATION';

-- BASIC MATERIALS - Lower margins, capital intensive
UPDATE "industry_multiples" SET "ebitda_margin_low" = 8.00, "ebitda_margin_high" = 15.00
WHERE "icb_industry" = 'BASIC_MATERIALS';

-- ENERGY - Variable but can be high
UPDATE "industry_multiples" SET "ebitda_margin_low" = 10.00, "ebitda_margin_high" = 20.00
WHERE "icb_industry" = 'ENERGY';

-- UTILITIES - Regulated, stable margins
UPDATE "industry_multiples" SET "ebitda_margin_low" = 15.00, "ebitda_margin_high" = 25.00
WHERE "icb_industry" = 'UTILITIES';

-- REAL ESTATE - High margins for service businesses
UPDATE "industry_multiples" SET "ebitda_margin_low" = 15.00, "ebitda_margin_high" = 30.00
WHERE "icb_industry" = 'REAL_ESTATE';

-- TELECOMMUNICATIONS - Moderate to high
UPDATE "industry_multiples" SET "ebitda_margin_low" = 12.00, "ebitda_margin_high" = 22.00
WHERE "icb_industry" = 'TELECOMMUNICATIONS';

-- Catch-all: Set default margins for any rows not yet updated
UPDATE "industry_multiples" SET "ebitda_margin_low" = 8.00, "ebitda_margin_high" = 15.00
WHERE "ebitda_margin_low" IS NULL;
