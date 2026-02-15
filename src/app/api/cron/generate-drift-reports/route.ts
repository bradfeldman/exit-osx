import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateDriftReport } from '@/lib/drift/generate-drift-report'
import { sendDriftReportEmail } from '@/lib/email/send-drift-report-email'
import { verifyCronAuth } from '@/lib/security/cron-auth'

/**
 * PROD-054: Monthly Drift Report Generation Cron
 *
 * Schedule: 1st of month at 6am
 *
 * Logic:
 * 1. Find all active companies (have at least 1 assessment or financial data)
 * 2. For each company, generate drift report using generateDriftReport()
 * 3. Send email notification to company owner
 * 4. Log completion/errors per company
 * 5. Return summary: total companies processed, successes, failures
 */
export async function GET(request: Request) {
  // SECURITY FIX (PROD-060): Uses verifyCronAuth which fails closed when CRON_SECRET is not set.
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    // Calculate last month's date range
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1) // 1st of current month
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1) // 1st of previous month

    const monthYear = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Find all active companies with at least 1 assessment or financial period
    const companiesWithAssessments = await prisma.company.findMany({
      where: {
        deletedAt: null,
        assessments: {
          some: {},
        },
      },
      select: { id: true },
    })

    const companiesWithFinancials = await prisma.company.findMany({
      where: {
        deletedAt: null,
        financialPeriods: {
          some: {},
        },
      },
      select: { id: true },
    })

    // Merge and dedupe company IDs
    const activeCompanyIds = new Set([
      ...companiesWithAssessments.map(c => c.id),
      ...companiesWithFinancials.map(c => c.id),
    ])

    // Fetch full company data for active companies
    const companies = await prisma.company.findMany({
      where: {
        id: { in: Array.from(activeCompanyIds) },
        deletedAt: null,
      },
      include: {
        ownerships: {
          where: { isSubscribingOwner: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          take: 1,
        },
      },
    })

    let generated = 0
    let skipped = 0
    let errors = 0
    const errorDetails: Array<{ companyId: string; companyName: string; error: string }> = []

    for (const company of companies) {
      try {
        // Check if report already exists for this period
        const existing = await prisma.driftReport.findFirst({
          where: {
            companyId: company.id,
            periodStart,
            periodEnd,
          },
        })

        if (existing) {
          console.log(`[GenerateDriftReports] Skipping ${company.name} - report already exists`)
          skipped++
          continue
        }

        // Generate the drift report
        const report = await generateDriftReport(company.id, periodStart, periodEnd)

        // Send email to owner
        const owner = company.ownerships[0]?.user
        if (owner?.email) {
          const emailResult = await sendDriftReportEmail({
            email: owner.email,
            name: owner.name || undefined,
            companyName: company.name,
            monthYear,
            briScoreStart: report.briScoreStart,
            briScoreEnd: report.briScoreEnd,
            valuationStart: report.valuationStart,
            valuationEnd: report.valuationEnd,
            tasksCompleted: await prisma.task.count({
              where: {
                companyId: company.id,
                status: 'COMPLETED',
                completedAt: { gte: periodStart, lte: periodEnd },
              },
            }),
            signalsCount: await prisma.signal.count({
              where: {
                companyId: company.id,
                createdAt: { gte: periodStart, lte: periodEnd },
              },
            }),
            topSignals: await prisma.signal.findMany({
              where: {
                companyId: company.id,
                createdAt: { gte: periodStart, lte: periodEnd },
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: {
                title: true,
                severity: true,
              },
            }),
            summary: `Your exit readiness ${report.driftResult.overallDriftDirection === 'IMPROVING' ? 'improved' : report.driftResult.overallDriftDirection === 'DECLINING' ? 'declined' : 'remained stable'} this month.`,
          })

          if (emailResult.success) {
            console.log(`[GenerateDriftReports] Email sent to ${owner.email} for ${company.name}`)
          } else {
            console.warn(`[GenerateDriftReports] Failed to send email to ${owner.email}: ${emailResult.error}`)
          }
        }

        console.log(`[GenerateDriftReports] Generated drift report for ${company.name}`)
        generated++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[GenerateDriftReports] Error processing company ${company.name}:`, errorMessage)
        errorDetails.push({
          companyId: company.id,
          companyName: company.name,
          error: errorMessage,
        })
        errors++
      }
    }

    console.log(
      `[GenerateDriftReports] Cron complete: ${generated} generated, ${skipped} skipped, ${errors} errors`
    )

    return NextResponse.json({
      success: true,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalCompanies: companies.length,
      generated,
      skipped,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined,
    })
  } catch (error) {
    console.error('[GenerateDriftReports] Cron error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      // SECURITY FIX (PROD-060): Removed String(error) details from response
      { error: 'Failed to run drift report generation cron' },
      { status: 500 }
    )
  }
}
