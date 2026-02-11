/**
 * Drift Report Generator
 *
 * This module delegates to the drift calculation engine at
 * `@/lib/drift/generate-drift-report` and returns a Prisma DriftReport
 * record for backward compatibility with the monthly cron job.
 *
 * The cron job at `src/app/api/cron/monthly-drift-report/route.ts`
 * handles email sending and partner notifications separately.
 */

import { generateDriftReport as generateDriftReportCore } from '@/lib/drift/generate-drift-report'

/**
 * Generate a drift report and persist it to the database.
 * Returns the Prisma DriftReport record.
 *
 * Side effects:
 * - Creates a DriftReport record in the database
 * - Creates a Signal if BRI dropped >5 points (HIGH) or >10 points (CRITICAL)
 * - Creates a ValueLedgerEntry for significant drift events
 */
export async function generateDriftReport(
  companyId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const result = await generateDriftReportCore(companyId, periodStart, periodEnd)

  // The cron expects a DriftReport-like object with these fields.
  // We fetch the actual record to ensure all Prisma fields are present.
  const { prisma } = await import('@/lib/prisma')
  const report = await prisma.driftReport.findUniqueOrThrow({
    where: { id: result.id },
  })

  return report
}
