# Industry Multiple Refresh Cron Job

**Endpoint:** `/api/cron/refresh-multiples`
**Schedule:** 1st of month at 10:00 AM (alongside drift reports)
**Task:** PROD-057

## Purpose

Automatically detect industry multiple changes and recalculate valuations for affected companies. This ensures company valuations stay current with market conditions without requiring manual intervention.

## How It Works

### 1. Detection Phase

- Queries `industry_multiples` table for updates in the last 30 days
- Groups by `icbSubSector` to find the most recent multiple per industry
- For each updated subsector, compares to previous multiple to calculate percent change

### 2. Significance Threshold

- **>10% change**: Triggers recalculation and signal creation
- **>20% change**: Creates HIGH severity signal
- **<10% change**: Recalculates valuation but no signal

The threshold prevents noise from minor market fluctuations while ensuring material changes are surfaced.

### 3. Recalculation Phase

- Finds all companies matching the updated subsectors
- Calls `recalculateSnapshotForCompany()` for each company
- Creates new `ValuationSnapshot` with updated multiples
- Tracks success/failure for each company

### 4. Signal Creation

For significant changes (>10%), creates a Signal with:

- **Channel:** SYSTEM
- **Category:** MARKET
- **Event Type:** MARKET_MULTIPLE_CHANGE
- **Severity:** MEDIUM (10-20%) or HIGH (>20%)
- **Confidence:** VERIFIED
- **Title:** "Industry multiples increased/decreased by X%"
- **Description:** Details the old vs new multiple ranges
- **Raw Data:** Full change metadata for audit trail

### 5. Error Handling

- Continues processing if individual recalculations fail
- Logs all errors for review
- Returns summary with success/failure counts
- Non-fatal signal creation failures (logged but don't block job)

## Response Format

```json
{
  "success": true,
  "multiplesUpdated": 3,
  "companiesRecalculated": 12,
  "companiesFailed": 1,
  "signalsCreated": 8,
  "significantChanges": 2,
  "errors": [
    {
      "companyId": "cuid123",
      "error": "No assessment responses found"
    }
  ]
}
```

## Future Enhancements

When an external data source becomes available (e.g., industry multiple API):

1. Add fetch logic to retrieve latest multiples
2. Compare against current database values
3. Insert new rows in `industry_multiples` with current `effectiveDate`
4. Existing detection/recalculation logic will handle the rest automatically

Current implementation assumes multiples are updated manually via admin UI (PROD-046).

## Data Model

### IndustryMultiple

```prisma
model IndustryMultiple {
  id                  String   @id @default(cuid())
  icbIndustry         String
  icbSuperSector      String
  icbSector           String
  icbSubSector        String
  revenueMultipleLow  Decimal  @db.Decimal(4, 2)
  revenueMultipleHigh Decimal  @db.Decimal(4, 2)
  ebitdaMultipleLow   Decimal  @db.Decimal(4, 2)
  ebitdaMultipleHigh  Decimal  @db.Decimal(4, 2)
  ebitdaMarginLow     Decimal? @db.Decimal(5, 2)
  ebitdaMarginHigh    Decimal? @db.Decimal(5, 2)
  effectiveDate       DateTime // Key for versioning
  source              String?

  @@unique([icbSubSector, effectiveDate])
}
```

The `effectiveDate` field enables time-series tracking. The `getIndustryMultiples()` function queries by `effectiveDate DESC` to always use the latest data.

## Manual Trigger (Development)

```bash
curl -X GET http://localhost:3000/api/cron/refresh-multiples \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

In development (NODE_ENV !== 'production'), no auth header required.

## Monitoring

Key metrics to track:

- **multiplesUpdated**: Number of industry subsectors updated
- **companiesRecalculated**: Successful valuation updates
- **companiesFailed**: Failed updates (investigate causes)
- **signalsCreated**: User-facing notifications sent
- **significantChanges**: Material changes detected (>10%)

## Dependencies

- `@/lib/prisma` - Database access
- `@/lib/security/cron-auth` - Authentication (fails closed)
- `@/lib/valuation/recalculate-snapshot` - Valuation recalculation
- `@/lib/valuation/industry-multiples` - Multiple lookup (used by recalculation)

## Testing

Comprehensive test coverage in `src/__tests__/cron/refresh-multiples.test.ts`:

- No recent multiples (early exit)
- Significant changes (>10%)
- High severity signals (>20%)
- Minor changes (<10%, no signal)
- New industries (no previous data)
- Recalculation failures
- Multiple subsectors
- Signal creation failures

Run tests: `npm test -- refresh-multiples.test.ts`

## Related Files

- `/api/cron/monthly-drift-report` - Runs same day, uses valuations
- `/api/admin/industry-multiples` - Manual admin UI for multiple updates
- `src/lib/valuation/calculate-valuation.ts` - Core valuation formula
- `vercel.json` - Cron schedule configuration
