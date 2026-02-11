# PROD-054, PROD-055, PROD-056 - Cron Jobs Implementation Summary

## Overview

Successfully implemented three scheduled background jobs (cron endpoints) for the Exit OSx platform:

1. **PROD-054**: Monthly Drift Report Generation
2. **PROD-055**: Inactivity Signal Generation
3. **PROD-056**: QuickBooks Scheduled Sync

All cron jobs follow existing patterns, include proper auth, error handling, and comprehensive logging.

---

## Files Created

### API Routes (3 files)
- `/src/app/api/cron/generate-drift-reports/route.ts` - PROD-054
- `/src/app/api/cron/detect-inactivity/route.ts` - PROD-055
- `/src/app/api/cron/sync-quickbooks/route.ts` - PROD-056

### Documentation (2 files)
- `/src/app/api/cron/README.md` - Comprehensive cron job documentation
- `/PROD-054-055-056-SUMMARY.md` - This file

### Tests (1 file)
- `/src/__tests__/cron/cron-jobs.test.ts` - Unit tests for core logic (10 tests, all passing)

### Configuration (1 file modified)
- `/vercel.json` - Added 3 new cron schedules

---

## Implementation Details

### PROD-054: Generate Drift Reports
**Endpoint:** `/api/cron/generate-drift-reports`
**Schedule:** 1st of month at 6am UTC (vercel.json: `"0 6 1 * *"`)

**What it does:**
1. Finds all active companies (with assessments or financial data)
2. Generates drift report for each company for the previous month
3. Sends email notification to subscribing owner
4. Skips companies that already have a report for the period
5. Returns summary: `{ generated, skipped, errors }`

**Key features:**
- Uses existing `generateDriftReport()` from `@/lib/drift/generate-drift-report`
- Sends emails via `sendDriftReportEmail()`
- Error isolation: individual failures don't stop batch processing
- Comprehensive logging with company context

**Response format:**
```json
{
  "success": true,
  "periodStart": "2026-01-01T00:00:00.000Z",
  "periodEnd": "2026-02-01T00:00:00.000Z",
  "totalCompanies": 45,
  "generated": 42,
  "skipped": 3,
  "errors": 0,
  "errorDetails": []
}
```

---

### PROD-055: Detect Inactivity
**Endpoint:** `/api/cron/detect-inactivity`
**Schedule:** Daily at 8am UTC (vercel.json: `"0 8 * * *"`)

**What it does:**
1. Queries `UserSession.lastActiveAt` to find users inactive 21+ days
2. For each inactive user with an active company:
   - Creates a signal with severity MEDIUM (21-45 days) or HIGH (45+ days)
   - Sends inactivity nudge email: "Your exit readiness may be slipping"
3. Skips users with existing unresolved inactivity signals
4. Returns summary: `{ signalsCreated, emailsSent, skipped }`

**Signal details:**
- **Channel:** TIME_DECAY
- **Event Type:** `user_inactivity`
- **Category:** PERSONAL
- **Severity:** MEDIUM (21-45 days), HIGH (45+ days)
- **Confidence:** CONFIDENT

**Email content:**
- Subject: "We haven't seen you in X weeks"
- Shows last known BRI score + pending tasks
- CTA: "Get Back on Track"

**Response format:**
```json
{
  "success": true,
  "usersChecked": 12,
  "signalsCreated": 8,
  "emailsSent": 8,
  "skipped": 4
}
```

---

### PROD-056: Sync QuickBooks
**Endpoint:** `/api/cron/sync-quickbooks`
**Schedule:** Daily at 2am UTC (vercel.json: `"0 2 * * *"`)

**What it does:**
1. Finds all active QuickBooks integrations (`autoSyncEnabled: true`, not disconnected)
2. For each integration:
   - Skips if synced within last 12 hours (prevents over-syncing)
   - Triggers sync via `syncQuickBooksData(integrationId, 'auto')`
   - On failure: creates `quickbooks_sync_failed` signal
3. Returns summary with per-company results

**Key features:**
- Token refresh handled automatically by `syncQuickBooksData()`
- 12-hour rate limit per integration
- Creates user-visible signals on sync failure
- Detailed per-company results in response

**Signal on failure:**
- **Channel:** INTEGRATION
- **Event Type:** `quickbooks_sync_failed`
- **Category:** FINANCIAL
- **Severity:** MEDIUM
- **Title:** "QuickBooks sync failed"

**Response format:**
```json
{
  "success": true,
  "integrationsChecked": 23,
  "synced": 20,
  "skipped": 2,
  "failed": 1,
  "results": [
    {
      "companyId": "clx123",
      "companyName": "Acme Corp",
      "status": "synced",
      "periodsCreated": 1,
      "periodsUpdated": 5
    }
  ]
}
```

---

## Authentication

All cron endpoints use Bearer token authentication in production:

```typescript
const authHeader = request.headers.get('authorization')
if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

**Required environment variable:**
- `CRON_SECRET` - Set in Vercel production environment

**Development mode:**
- Auth is bypassed (no Bearer token required)
- Allows easy local testing

---

## Testing

### Unit Tests
**File:** `/src/__tests__/cron/cron-jobs.test.ts`
**Status:** ✅ All 10 tests passing

**Test coverage:**
- Date range calculations (PROD-054)
- Active company detection (PROD-054)
- Days since last login calculation (PROD-055)
- Severity assignment logic (PROD-055)
- 12-hour sync window calculation (PROD-056)
- Active integration detection (PROD-056)
- Bearer token validation (all crons)
- Response format consistency (all crons)

### Manual Testing

**Local (no auth required):**
```bash
curl http://localhost:3000/api/cron/generate-drift-reports
curl http://localhost:3000/api/cron/detect-inactivity
curl http://localhost:3000/api/cron/sync-quickbooks
```

**Production (requires CRON_SECRET):**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://app.exitosx.com/api/cron/generate-drift-reports
```

---

## Build Status

✅ **Build successful** - No TypeScript errors in new cron files

```bash
npm run build
# ✓ Compiled successfully
```

Pre-existing test file linting issues are unrelated to this PR.

---

## Dependencies

All three cron jobs leverage existing Exit OSx infrastructure:

**Core libraries:**
- `@/lib/prisma` - Database queries
- `@/lib/drift/generate-drift-report` - Drift calculation engine (PROD-054)
- `@/lib/signals/create-signal` - Signal creation with ledger entries (PROD-055, PROD-056)
- `@/lib/integrations/quickbooks/sync` - QuickBooks sync logic (PROD-056)

**Email templates:**
- `@/lib/email/send-drift-report-email` - Monthly drift summary (PROD-054)
- `@/lib/email/send-inactivity-nudge-email` - User re-engagement (PROD-055)

**Authentication:**
- `@/lib/email/service` - Email rate limiting and preference checking

---

## Deployment Checklist

### Pre-deployment
- [x] Build passes without errors
- [x] Unit tests pass (10/10)
- [x] vercel.json updated with cron schedules
- [x] README documentation created

### Production deployment
- [ ] Set `CRON_SECRET` in Vercel environment variables
- [ ] Verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set
- [ ] Push to git (required before Vercel production deploy)
- [ ] Deploy to Vercel
- [ ] Monitor cron logs after first scheduled run

### Post-deployment verification
- [ ] Check Vercel cron logs for first run of each job
- [ ] Verify drift reports are generated on 1st of month
- [ ] Verify inactivity signals are created daily
- [ ] Verify QuickBooks syncs run daily at 2am
- [ ] Check email delivery in Resend dashboard

---

## Monitoring

All cron jobs log structured output:

```
[GenerateDriftReports] Generated drift report for Acme Corp
[DetectInactivity] Created MEDIUM signal for user@example.com (28 days inactive)
[SyncQuickBooks] Successfully synced TechCo: 1 created, 5 updated
```

**Error tracking:**
- Individual failures logged with context
- Errors don't halt batch processing
- Summary includes error counts and details

**User visibility:**
- Failed QuickBooks syncs create signals
- Inactivity signals appear in dashboard
- Drift reports arrive via email

---

## Edge Cases Handled

### PROD-054 (Drift Reports)
- ✅ Skips companies with existing reports for the period
- ✅ Handles companies without financial data gracefully
- ✅ Continues on email send failure (logged but doesn't fail cron)
- ✅ Isolates errors per company

### PROD-055 (Inactivity)
- ✅ Skips users without active companies
- ✅ Skips users with existing unresolved inactivity signals
- ✅ Handles missing user sessions gracefully
- ✅ Severity escalates from MEDIUM to HIGH at 45 days

### PROD-056 (QuickBooks)
- ✅ 12-hour rate limit prevents over-syncing
- ✅ Token refresh handled automatically
- ✅ Creates signals on sync failure (user awareness)
- ✅ Skips disabled/disconnected integrations
- ✅ Skips deleted companies

---

## Future Enhancements

Potential improvements for future iterations:

1. **Dashboard visibility:**
   - Add cron job status page for admins
   - Show last run times and success rates

2. **Alerting:**
   - Slack/email alerts for repeated cron failures
   - Sentry integration for error tracking

3. **Analytics:**
   - Track drift report open rates
   - Measure inactivity signal effectiveness
   - QuickBooks sync success rate metrics

4. **Optimization:**
   - Parallel processing for large batches
   - Incremental sync for QuickBooks (only changed periods)

---

## Notes

- **Timezone:** All schedules use UTC
- **Email rate limits:** Enforced by `@/lib/email/service.ts`
- **Signal deduplication:** Checks for existing unresolved signals before creating new ones
- **QuickBooks token expiry:** Handled transparently by sync logic
- **Drift report overlap:** Legacy `monthly-drift-report` cron still exists; `generate-drift-reports` is preferred

---

## Success Criteria

✅ All three cron jobs implemented and tested
✅ No TypeScript errors
✅ Unit tests pass (10/10)
✅ vercel.json schedules configured
✅ Comprehensive documentation created
✅ Follows existing cron patterns (auth, logging, error handling)
✅ Leverages existing infrastructure (drift engine, email system, QB sync)

---

## Contact

For questions or issues:
- Check `/src/app/api/cron/README.md` for detailed documentation
- Review Vercel cron logs for debugging
- Test endpoints locally without auth in development mode
