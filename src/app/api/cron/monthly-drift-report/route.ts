import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateDriftReport } from '@/lib/drift-report/generate-report'
import { sendDriftReportEmail } from '@/lib/email/send-drift-report-email'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Calculate last month's date range
    const now = new Date()
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1) // 1st of current month
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1) // 1st of previous month

    const monthYear = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Find all companies with a subscribing owner
    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        ownerships: {
          some: {
            isSubscribingOwner: true,
          },
        },
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
          skipped++
          continue
        }

        // Generate the report
        const report = await generateDriftReport(company.id, periodStart, periodEnd)

        // Send email to owner
        const owner = company.ownerships[0]?.user
        if (owner?.email) {
          const emailResult = await sendDriftReportEmail({
            email: owner.email,
            name: owner.name || undefined,
            companyName: company.name,
            monthYear,
            briScoreStart: Number(report.briScoreStart),
            briScoreEnd: Number(report.briScoreEnd),
            valuationStart: Number(report.valuationStart),
            valuationEnd: Number(report.valuationEnd),
            tasksCompleted: report.tasksCompletedCount,
            signalsCount: report.signalsCount,
            topSignals: (report.topSignals as { title: string; severity: string }[]) || [],
            summary: report.summary,
          })

          if (emailResult.success) {
            await prisma.driftReport.update({
              where: { id: report.id },
              data: { emailSentAt: new Date() },
            })
          }
        }

        generated++
      } catch (error) {
        console.error(`[DriftReport] Error generating report for company ${company.id}:`, error)
        errors++
      }
    }

    console.log(`[DriftReport] Monthly cron complete: ${generated} generated, ${skipped} skipped, ${errors} errors`)

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      errors,
      totalCompanies: companies.length,
    })
  } catch (error) {
    console.error('[DriftReport] Cron error:', error)
    return NextResponse.json(
      { error: 'Failed to run monthly drift report cron' },
      { status: 500 }
    )
  }
}
