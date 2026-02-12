-- Re-scope PersonalFinancials from Organization to User
-- Each user gets their own PFS record instead of sharing one per org

-- Step 1: Add userId column (nullable initially for backfill)
ALTER TABLE "personal_financials" ADD COLUMN "user_id" TEXT;

-- Step 2: Backfill user_id from the org's primary admin/owner
UPDATE "personal_financials" pf SET "user_id" = (
  SELECT ou."user_id" FROM "organization_users" ou
  WHERE ou."organization_id" = pf."organization_id"
  AND ou."role" IN ('SUPER_ADMIN', 'ADMIN')
  ORDER BY ou."joined_at" ASC LIMIT 1
);

-- Step 3: For any remaining records without a match, use any org member
UPDATE "personal_financials" pf SET "user_id" = (
  SELECT ou."user_id" FROM "organization_users" ou
  WHERE ou."organization_id" = pf."organization_id"
  ORDER BY ou."joined_at" ASC LIMIT 1
) WHERE pf."user_id" IS NULL;

-- Step 4: Make user_id required
ALTER TABLE "personal_financials" ALTER COLUMN "user_id" SET NOT NULL;

-- Step 5: Create unique index on user_id (one PFS per user)
CREATE UNIQUE INDEX "personal_financials_user_id_key" ON "personal_financials"("user_id");

-- Step 6: Add foreign key to users table
ALTER TABLE "personal_financials" ADD CONSTRAINT "personal_financials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Make organizationId optional (keep column for safety during migration)
ALTER TABLE "personal_financials" ALTER COLUMN "organization_id" DROP NOT NULL;

-- Step 8: Drop the unique constraint on organization_id
DROP INDEX IF EXISTS "personal_financials_organization_id_key";
