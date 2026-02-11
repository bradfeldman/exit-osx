# Prisma Migration Verification Checklist

## Purpose

Missing migrations cause silent 500 errors in production. This document defines the
verification process for ensuring all schema changes are properly migrated before
deployment.

---

## Current Migration Status (2026-02-10)

**Status: ALL MIGRATIONS APPLIED**

33 migrations exist in `prisma/migrations/`. `prisma migrate status` confirms
"Database schema is up to date!" against production.

### Migration Inventory

| # | Migration | PROD Item | Description |
|---|-----------|-----------|-------------|
| 1 | `20260113031932_init` | -- | Initial schema (~60 models, ~50 enums) |
| 2 | `20260113070328_add_organization_invites` | -- | OrganizationInvite model |
| 3 | `20260113154420_add_system_settings` | -- | SystemSetting model |
| 4 | `20260113200237_add_company_bri_weights` | -- | Company.briWeights JSON field |
| 5 | `20260113203616_add_snapshot_user_tracking` | -- | ValuationSnapshot.createdByUserId |
| 6 | `20260114023645_add_financials_models` | -- | FinancialPeriod, IncomeStatement, BalanceSheet, CashFlowStatement |
| 7 | `20260114052851_add_company_soft_delete` | -- | Company.deletedAt, Company.deleteReason |
| 8 | `20260115184102_add_answer_upgrade_system` | -- | AssessmentResponse.effectiveOptionId, Task upgrade fields |
| 9 | `20260115204154_add_buyer_logic_to_question` | -- | Question.buyerLogic |
| 10 | `20260116152808_add_adjustment_frequency` | -- | EbitdaAdjustment.frequency |
| 11 | `20260116164807_add_project_assessments` | -- | ProjectAssessment, ProjectQuestion, etc. |
| 12 | `20260116194934_add_skip_to_assessment_questions` | -- | ProjectAssessmentQuestion.skipped |
| 13 | `20260116220527_add_issue_tier` | -- | Question.issueTier, Task.issueTier |
| 14 | `20260128_add_base_fcf` | -- | DCFAssumptions.baseFCF |
| 15 | `20260130180216_contact_system_canonical_layer` | -- | Full contact system: Canonical*, Deal*, DealBuyer, etc. |
| 16 | `20260202_add_business_profile_fields` | -- | Company.businessProfile, profileQuestionsAnswered |
| 17 | `20260205_add_ebitda_margin_columns` | -- | IndustryMultiple.ebitdaMarginLow/High |
| 18 | `20260205_add_mode_3_4_5_fields` | -- | Mode 3/4/5 fields across multiple models |
| 19 | `20260205_add_risk_driver_name` | -- | Question.riskDriverName |
| 20 | `20260206_add_drift_reports` | -- | DriftReport model |
| 21 | `20260206_add_missing_tables` | -- | Backfill for tables missed in prior migrations |
| 22 | `20260206_remove_sprint_model` | -- | Dropped Sprint model |
| 23 | `20260208_add_question_company_id` | PROD-014 | Question.companyId (AI-generated questions) |
| 24 | `20260209_add_auto_dcf_fields` | -- | ValuationSnapshot dcf* fields, DCFAssumptions extensions |
| 25 | `20260209_add_company_dossiers` | -- | CompanyDossier model |
| 26 | `20260209_add_deal_participants` | -- | DealParticipant model + fields |
| 27 | `20260210_add_assessment_cadence` | PROD-017 | Company.assessmentCadence, Company.cadencePromptsShownAt |
| 28 | `20260210_add_email_notification_system` | -- | EmailPreference, EmailLog models |
| 29 | `20260210205418_add_task_sub_steps` | PROD-037 | TaskSubStep model |
| 30 | `rls_phase1_core` | -- | RLS policies for core access tables |
| 31 | `rls_phase2_company_data` | -- | RLS policies for company-scoped data |
| 32 | `rls_phase3_remaining` | -- | RLS policies for remaining tables |

Note: Migration count shows 33 in `prisma migrate status` which includes the
`migration_lock.toml` entry. 32 actual SQL migrations + lock file = 33.

---

## Pre-Deploy Verification Process

### Step 1: Check for Un-Migrated Schema Changes

```bash
# Validate schema syntax
npx prisma validate

# Check migration status against the database
npx prisma migrate status
```

If `prisma migrate status` reports "Database schema is up to date!" then all
migrations are applied. If it reports pending migrations, proceed to Step 3.

### Step 2: Generate Migration for New Schema Changes

If you have modified `prisma/schema.prisma` and need a new migration:

```bash
# Generate migration SQL (review before applying)
npx prisma migrate dev --name describe_the_change --create-only
```

Review the generated `migration.sql` before applying. Check for:
- Destructive operations (DROP TABLE, DROP COLUMN) -- these need data migration plans
- ALTER TABLE that could lock large tables
- Index creation on large tables (consider CONCURRENTLY where supported)

### Step 3: Apply Migrations to Production

**CRITICAL: Use the direct database URL (port 5432), NOT the connection pooler (port 6543).**

DDL operations (CREATE TABLE, ALTER TABLE) must use direct connections because:
- Pooler connections may timeout during long DDL operations
- Transaction isolation requirements for schema changes
- Supabase's pooler (PgBouncer) does not support all DDL in transaction mode

The `prisma.config.ts` already handles this by preferring `DIRECT_URL`:
```typescript
datasource: {
  url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
}
```

Apply migrations:
```bash
# Deploy all pending migrations
npx prisma migrate deploy
```

### Step 4: Verify Migration Success

```bash
# Confirm all migrations applied
npx prisma migrate status

# Regenerate Prisma Client
npx prisma generate
```

### Step 5: Deploy Application Code

Only after migrations are confirmed applied:
1. Push to git (which triggers Vercel deployment)
2. Verify the deployment succeeds
3. Smoke-test key API routes that touch new/modified tables

**IMPORTANT: Git deploys overwrite CLI deploys. Always push to git before
running `npx vercel --prod`.**

---

## Migration Strategy: Roll Forward Only

**Never roll back migrations.** Reasons:
1. Data migrations are not reversible (new columns may have been populated)
2. RLS policies depend on specific table structures
3. Other migrations may reference objects created by earlier migrations
4. Application code expects the new schema

If a migration causes issues:
1. Diagnose the problem
2. Create a new migration that fixes the issue (ALTER/DROP as needed)
3. Apply the fix-forward migration
4. Deploy updated application code

---

## Common Failure Modes

### Missing Column -> Silent 500
**Symptom**: API route returns 500; logs show `Unknown field` or similar Prisma error.
**Cause**: Schema was updated, `prisma generate` was run (so TS types updated), but
migration was not applied to production database.
**Fix**: Run `npx prisma migrate deploy` against production.

### Pooler Timeout During DDL
**Symptom**: Migration fails with connection timeout.
**Cause**: Using pooler URL (port 6543) instead of direct URL (port 5432).
**Fix**: Set `DIRECT_URL` environment variable to the direct PostgreSQL connection string.

### RLS Policy Blocks Migration
**Symptom**: Migration fails with permission denied.
**Cause**: RLS policies prevent schema changes.
**Fix**: Ensure migration runs as the database owner, not an RLS-restricted role.

---

## Naming Conventions

Migration names follow the pattern: `YYYYMMDD[HHMMSS]_descriptive_name`

- Use lowercase with underscores
- Start with a date prefix (Prisma adds timestamp automatically with `migrate dev`)
- Describe what the migration does, not why (the PROD item provides the why)
- For PROD items, reference the PROD number in the migration SQL comment header

Example:
```sql
-- PROD-017: Assessment Cadence Control (Fatigue Prevention)
-- Adds cadence preference and prompt tracking to companies table
ALTER TABLE "companies" ADD COLUMN "assessment_cadence" TEXT NOT NULL DEFAULT 'monthly';
```

---

## Automated Verification (Future Enhancement)

Consider adding to CI/CD pipeline:
```bash
# In build step or pre-deploy hook:
npx prisma migrate status --exit-code
# Returns non-zero if migrations are pending
```

This would block deploys when migrations are out of sync with the schema.
