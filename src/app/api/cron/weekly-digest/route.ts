import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklyDigestEmail } from '@/lib/email/send-weekly-digest-email'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV === 'production' && CRON_SECRET) {
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)

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

    let sent = 0
    let skipped = 0
    let errors = 0

    for (const company of companies) {
      try {
        // Get latest valuation snapshot for current values
        const latestSnapshot = await prisma.valuationSnapshot.findFirst({
          where: { companyId: company.id },
          orderBy: { createdAt: 'desc' },
        })

        // Skip companies that haven't been onboarded (no snapshot yet)
        if (!latestSnapshot) {
          skipped++
          continue
        }

        // Get snapshot from ~7 days ago for weekly delta
        const previousSnapshot = await prisma.valuationSnapshot.findFirst({
          where: {
            companyId: company.id,
            createdAt: { lte: weekStart },
          },
          orderBy: { createdAt: 'desc' },
        })

        const currentValue = Number(latestSnapshot.currentValue)
        const previousValue = previousSnapshot ? Number(previousSnapshot.currentValue) : currentValue
        const valueChange = currentValue - previousValue

        const briScore = Number(latestSnapshot.briScore)
        const previousBri = previousSnapshot ? Number(previousSnapshot.briScore) : briScore
        const briChange = briScore - previousBri

        // Count tasks completed this week
        const tasksCompleted = await prisma.task.count({
          where: {
            companyId: company.id,
            status: 'COMPLETED',
            completedAt: { gte: weekStart },
          },
        })

        // Count pending tasks
        const tasksPending = await prisma.task.count({
          where: {
            companyId: company.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            inActionPlan: true,
          },
        })

        // Get top pending task (highest normalizedValue)
        const topTask = await prisma.task.findFirst({
          where: {
            companyId: company.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            inActionPlan: true,
          },
          orderBy: { normalizedValue: 'desc' },
          select: {
            title: true,
            normalizedValue: true,
          },
        })

        // Send email to owner
        const owner = company.ownerships[0]?.user
        if (!owner?.email) {
          skipped++
          continue
        }

        await sendWeeklyDigestEmail({
          email: owner.email,
          name: owner.name || undefined,
          companyName: company.name,
          currentValue,
          valueChange,
          briScore,
          briChange,
          tasksCompleted,
          tasksPending,
          topTask: topTask
            ? {
                title: topTask.title,
                estimatedValue: Number(topTask.normalizedValue),
              }
            : null,
        })

        sent++
      } catch (error) {
        console.error(`[WeeklyDigest] Error processing company ${company.id}:`, error)
        errors++
      }
    }

    console.log(`[WeeklyDigest] Cron complete: ${sent} sent, ${skipped} skipped, ${errors} errors`)

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      errors,
      totalCompanies: companies.length,
    })
  } catch (error) {
    console.error('[WeeklyDigest] Cron error:', error)
    return NextResponse.json(
      { error: 'Failed to run weekly digest cron' },
      { status: 500 }
    )
  }
}
