# Email Notification System

Exit OSx email notification infrastructure built on Resend.

## Architecture

- **Service Layer** (`service.ts`) - Core email sending with preference checking, rate limiting, and logging
- **Preferences** (`preferences.ts`) - User email preference management and unsubscribe handling
- **Templates** (`send-*-email.ts`) - Individual email template implementations
- **Types** (`types.ts`) - TypeScript interfaces for the email system
- **API Routes** - REST endpoints for triggering emails and handling unsubscribes

## Email Types

| Email Type | Purpose | Trigger | Rate Limit |
|------------|---------|---------|------------|
| `ONBOARDING_COMPLETE` | Exit Readiness Report after onboarding | After assessment completion | None |
| `DRIFT_REPORT` | Monthly drift summary | Cron (monthly) | 30 days |
| `SIGNAL_ALERT` | Critical signal notification | Signal detection (severity >= HIGH) | 24 hours |
| `WEEKLY_CHECKIN` | Prompt to update data | Cron (weekly) | 7 days |
| `WEEKLY_DIGEST` | Weekly progress summary | Cron (weekly) | 7 days |
| `INACTIVITY_NUDGE` | Re-engagement after 21 days | Cron (daily check) | 21 days |
| `TASK_REMINDER` | "Your gap is growing" nudge | Day 3 after onboarding if no tasks completed | 3 days |
| `TASK_DELEGATION` | Task assignment invite | Manual delegation | None |
| `PARTNER_INVITE` | Accountability partner invite | Manual invite | None |
| `PARTNER_MONTHLY_SUMMARY` | Partner progress update | Cron (monthly) | 30 days |
| `PARTNER_NUDGE` | Partner check-in reminder | Cron (weekly) | 7 days |
| `ACCOUNT_EXISTS` | Signup error notification | Duplicate signup attempt | None |

## Usage

### Sending an Email

```typescript
import { sendDriftReportEmail } from '@/lib/email'

await sendDriftReportEmail({
  userId: 'user_123',
  email: 'owner@example.com',
  name: 'John Doe',
  companyId: 'company_456',
  companyName: 'Acme Corp',
  monthYear: 'January 2026',
  briScoreStart: 0.65,
  briScoreEnd: 0.70,
  valuationStart: 2500000,
  valuationEnd: 2750000,
  tasksCompleted: 3,
  signalsCount: 1,
  topSignals: [{ title: 'Revenue drop', severity: 'HIGH' }],
  summary: 'Strong progress this month.',
})
```

### Checking Preferences

```typescript
import { canSendEmail } from '@/lib/email'

const allowed = await canSendEmail(userId, 'WEEKLY_DIGEST')
if (allowed) {
  // Send email
}
```

### Managing Preferences

```typescript
import { updateEmailPreferences } from '@/lib/email'

await updateEmailPreferences(userId, {
  frequency: 'MONTHLY',
  enabledTypes: ['DRIFT_REPORT', 'SIGNAL_ALERT'],
})
```

## Rate Limiting

Emails are automatically rate-limited based on type:
- Critical alerts: 24 hours
- Weekly digests: 7 days
- Monthly reports: 30 days
- Transactional (delegation, invites): No limit

Rate limits are enforced per user per email type.

## Email Preferences

Users can control their email notifications:
- **Frequency**: `REALTIME`, `DAILY`, `WEEKLY`, `MONTHLY`, `NEVER`
- **Enabled Types**: Array of specific email types to receive
- **Global Unsubscribe**: Blocks all emails

Default: Weekly frequency with all email types enabled.

## Unsubscribe Handling

Every email includes an unsubscribe link:
```
https://app.exitosx.com/api/email/unsubscribe?token=xxx
```

When clicked:
1. User is globally unsubscribed
2. All future emails are blocked (unless manually re-subscribed)
3. Confirmation page is displayed

## Database Schema

### `email_preferences`
```prisma
model EmailPreference {
  id               String    @id @default(cuid())
  userId           String    @unique
  frequency        String    @default("WEEKLY")
  enabledTypes     String[]  @default([])
  unsubscribedAt   DateTime?
  unsubscribeToken String?   @unique
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  user             User      @relation(...)
}
```

### `email_logs`
```prisma
model EmailLog {
  id             String   @id @default(cuid())
  userId         String
  companyId      String?
  emailType      String
  recipientEmail String
  subject        String
  success        Boolean
  error          String?
  sentAt         DateTime @default(now())
  user           User     @relation(...)
  company        Company? @relation(...)
}
```

## Environment Variables

```bash
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=Exit OSx <noreply@exitosx.com>
NEXT_PUBLIC_APP_URL=https://app.exitosx.com
```

## API Endpoints

### `POST /api/email/send`
Internal endpoint for triggering emails (used by cron jobs, services).

**Body:**
```json
{
  "userId": "user_123",
  "companyId": "company_456",
  "emailType": "DRIFT_REPORT",
  "to": "owner@example.com",
  "subject": "Your Monthly Drift Report",
  "html": "<html>...</html>",
  "skipPreferenceCheck": false
}
```

### `GET /api/email/unsubscribe?token=xxx`
Handles email unsubscribe via unique token. Returns HTML confirmation page.

## Integration Points

### Drift Engine
```typescript
import { sendDriftReportEmail } from '@/lib/email'

// After monthly drift calculation
await sendDriftReportEmail({ ... })
```

### Signal Pipeline
```typescript
import { sendSignalAlertEmail } from '@/lib/email'

// When CRITICAL signal detected
if (signal.severity === 'CRITICAL') {
  await sendSignalAlertEmail({ ... })
}
```

### Cron Jobs (vercel.json)
```json
{
  "crons": [
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 9 * * MON"
    },
    {
      "path": "/api/cron/inactivity-check",
      "schedule": "0 10 * * *"
    }
  ]
}
```

### Task Delegation
```typescript
import { sendTaskDelegationEmail } from '@/lib/email'

// When task is delegated
await sendTaskDelegationEmail({ ... })
```

## Error Handling

All email sends are logged to `email_logs` table with success/failure status.

Failed emails:
- Are logged with error message
- Do NOT throw exceptions (fail gracefully)
- Return `{ success: false, error: string }`

Console logging:
```
[Email] Successfully sent DRIFT_REPORT to owner@example.com
[Email] Rate limit hit for WEEKLY_DIGEST to user user_123
[Email] Failed to send SIGNAL_ALERT: Connection timeout
```

## Testing

```typescript
// Stub Resend in tests
jest.mock('resend')

// Check preference logic
expect(await canSendEmail('user_123', 'DRIFT_REPORT')).toBe(true)

// Verify rate limiting
await sendEmail({ ... })
await sendEmail({ ... }) // Should be blocked
```

## Future Enhancements

- [ ] Email preview mode (send to test address)
- [ ] Batch email sending for notifications
- [ ] Template versioning and A/B testing
- [ ] Email analytics (open rates, click rates)
- [ ] Rich text editor for admin-created emails
- [ ] SMS notifications via Twilio integration
