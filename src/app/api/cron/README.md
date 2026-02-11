# Exit OSx Cron Jobs

This directory contains all scheduled background jobs (cron endpoints) for the Exit OSx platform.

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

Set `CRON_SECRET` in your production environment variables.

## Cron Schedule (Vercel)

Configured in `/vercel.json`:

| Job | Path | Schedule | Description |
|-----|------|----------|-------------|
| Trial Expiration | `/api/cron/check-trial-expiration` | Daily at 12am | Check for expiring trials |
| Document Decay | `/api/cron/detect-document-decay` | Daily at 6am | Mark documents as OVERDUE and create signals |
| Financial Staleness | `/api/cron/detect-financial-staleness` | Weekly Mon at 7am | Detect stale financial data |
| Monthly Drift Report | `/api/cron/monthly-drift-report` | 1st of month at 9am | Legacy drift report (deprecated, use generate-drift-reports) |
| Weekly Digest | `/api/cron/weekly-digest` | Weekly Mon at 9am | Send weekly summary emails |
| Task Reminder | `/api/cron/task-reminder` | Daily at 10am | Send task reminder emails |
| **Generate Drift Reports** | `/api/cron/generate-drift-reports` | **1st of month at 6am** | **PROD-054: Generate monthly drift reports for all active companies** |
| **Detect Inactivity** | `/api/cron/detect-inactivity` | **Daily at 8am** | **PROD-055: Create signals for inactive users (21+ days)** |
| **Sync QuickBooks** | `/api/cron/sync-quickbooks` | **Daily at 2am** | **PROD-056: Auto-sync QuickBooks integrations** |

## New Cron Jobs (PROD-054, PROD-055, PROD-056)

### PROD-054: Generate Drift Reports (`/api/cron/generate-drift-reports`)

**Schedule:** 1st of month at 6am
**Purpose:** Generate monthly drift reports for all active companies and send email notifications.

**Logic:**
1. Find all active companies (with assessments or financial data)
2. For each company:
   - Generate drift report using `generateDriftReport(companyId, periodStart, periodEnd)`
   - Send email to subscribing owner via `sendDriftReportEmail()`
   - Skip if report already exists for the period
3. Return summary: `{ generated, skipped, errors }`

**Response:**
```json
{
  "success": true,
  "periodStart": "2026-01-01T00:00:00.000Z",
  "periodEnd": "2026-02-01T00:00:00.000Z",
  "totalCompanies": 45,
  "generated": 42,
  "skipped": 3,
  "errors": 0
}
```

**Dependencies:**
- `@/lib/drift/generate-drift-report` - Core drift calculation engine
- `@/lib/email/send-drift-report-email` - Email template

---

### PROD-055: Detect Inactivity (`/api/cron/detect-inactivity`)

**Schedule:** Daily at 8am
**Purpose:** Detect inactive users (21+ days since last login) and create signals + send nudge emails.

**Logic:**
1. Query `UserSession.lastActiveAt` to find users inactive 21+ days
2. For each inactive user with an active company:
   - Check for existing unresolved `user_inactivity` signal (skip if exists)
   - Create signal with:
     - **Severity:** MEDIUM (21-45 days), HIGH (45+ days)
     - **Channel:** TIME_DECAY
     - **Category:** PERSONAL
     - **Event Type:** `user_inactivity`
   - Send inactivity nudge email: "Your exit readiness may be slipping"
3. Return summary: `{ signalsCreated, emailsSent, skipped }`

**Response:**
```json
{
  "success": true,
  "usersChecked": 12,
  "signalsCreated": 8,
  "emailsSent": 8,
  "skipped": 4
}
```

**Dependencies:**
- `@/lib/signals/create-signal` - Signal creation with ledger entry
- `@/lib/email/send-inactivity-nudge-email` - Email template

**Signal Auto-Resolution:**
Signals resolve automatically on next user login (handled separately in auth middleware).

---

### PROD-056: Sync QuickBooks (`/api/cron/sync-quickbooks`)

**Schedule:** Daily at 2am
**Purpose:** Automatically sync financial data from QuickBooks Online for all active integrations.

**Logic:**
1. Find all active QuickBooks integrations (`autoSyncEnabled: true`, `disconnectedAt: null`)
2. For each integration:
   - Skip if synced within last 12 hours (prevent over-syncing)
   - Trigger sync via `syncQuickBooksData(integrationId, 'auto')`
   - Handle token refresh automatically (built into sync logic)
   - On failure: create `quickbooks_sync_failed` signal (MEDIUM severity, FINANCIAL category)
3. Return summary: `{ synced, skipped, failed, results[] }`

**Response:**
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
    },
    {
      "companyId": "clx456",
      "companyName": "TechCo",
      "status": "failed",
      "error": "Token expired"
    }
  ]
}
```

**Dependencies:**
- `@/lib/integrations/quickbooks/sync` - QuickBooks sync engine with OAuth token refresh
- `@/lib/signals/create-signal` - Signal creation for sync failures

**Rate Limiting:**
- Min 12 hours between syncs per integration
- Prevents API quota exhaustion
- Allows manual syncs to override

---

## Testing Cron Jobs Locally

### Manual Trigger (Development)
```bash
# No auth required in development mode
curl http://localhost:3000/api/cron/generate-drift-reports
curl http://localhost:3000/api/cron/detect-inactivity
curl http://localhost:3000/api/cron/sync-quickbooks
```

### Manual Trigger (Production)
```bash
# Requires CRON_SECRET
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://app.exitosx.com/api/cron/generate-drift-reports
```

### Vercel CLI (Test Production Schedules)
```bash
# Test a cron job without waiting for schedule
npx vercel cron /api/cron/generate-drift-reports
```

---

## Monitoring

All cron jobs log to console with structured format:

```
[GenerateDriftReports] Generated drift report for Acme Corp
[DetectInactivity] Created MEDIUM signal for user@example.com (28 days inactive)
[SyncQuickBooks] Successfully synced TechCo: 1 created, 5 updated
```

**Error Handling:**
- Errors logged with company/user context
- Individual failures don't halt batch processing
- Summary includes error counts and details

**Observability:**
- All crons return JSON with counts: `{ generated, skipped, errors }`
- Failed syncs create user-visible signals
- Email send failures are logged but don't fail the cron

---

## Common Patterns

### Cron Auth Header
```typescript
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  // ... cron logic
}
```

### Deduplication
```typescript
// Check for existing report/signal before creating
const existing = await prisma.driftReport.findFirst({
  where: { companyId, periodStart, periodEnd },
})
if (existing) {
  skipped++
  continue
}
```

### Error Isolation
```typescript
// Process all items, don't fail on individual errors
for (const item of items) {
  try {
    await processItem(item)
    success++
  } catch (error) {
    console.error(`Error processing ${item.id}:`, error)
    errors++
  }
}
```

---

## Adding New Cron Jobs

1. **Create route:** `/src/app/api/cron/[job-name]/route.ts`
2. **Add auth check** (copy from existing crons)
3. **Implement batch logic** with error isolation
4. **Return JSON summary** (`{ success, processed, skipped, errors }`)
5. **Update `vercel.json`** with schedule
6. **Document in this README**
7. **Test locally** before deploying

---

## Dependencies

- **Prisma:** Database queries
- **Next.js:** API routes
- **Vercel Cron:** Scheduled execution
- **Resend:** Email delivery
- **Signal System:** User-visible alerts
- **Value Ledger:** Drift tracking

---

## Notes

- **Time zones:** All schedules use UTC
- **Drift Report Overlap:** `monthly-drift-report` is legacy. New cron `generate-drift-reports` is preferred (same logic, better naming).
- **QuickBooks Token Refresh:** Automatic via `syncQuickBooksData()` (no manual intervention needed)
- **Inactivity Signals:** Auto-resolve on next login (tracked in auth middleware)
- **Email Rate Limits:** Enforced by `@/lib/email/service.ts` (prevents spam)
