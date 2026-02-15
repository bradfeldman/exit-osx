import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTaskReminderEmail } from '@/lib/email/send-task-reminder-email'
import { verifyCronAuth } from '@/lib/security/cron-auth'

export async function GET(request: Request) {
  // SECURITY FIX (PROD-060): Uses verifyCronAuth which fails closed when CRON_SECRET is not set.
  const authError = verifyCronAuth(request)
  if (authError) return authError

  try {
    const now = new Date()

    // Day 3 window: companies created between 3 and 4 days ago
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    threeDaysAgo.setHours(0, 0, 0, 0)

    const fourDaysAgo = new Date(now)
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)
    fourDaysAgo.setHours(0, 0, 0, 0)

    // Find companies in the Day 3 window with no completed tasks
    const companies = await prisma.company.findMany({
      where: {
        deletedAt: null,
        createdAt: {
          gte: fourDaysAgo,
          lt: threeDaysAgo,
        },
        ownerships: {
          some: {
            isSubscribingOwner: true,
          },
        },
        // No completed tasks
        tasks: {
          none: {
            status: 'COMPLETED',
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
        const owner = company.ownerships[0]?.user
        if (!owner?.email) {
          skipped++
          continue
        }

        // Get latest snapshot for value gap
        const latestSnapshot = await prisma.valuationSnapshot.findFirst({
          where: { companyId: company.id },
          orderBy: { createdAt: 'desc' },
        })

        if (!latestSnapshot) {
          skipped++
          continue
        }

        const valueGap = Number(latestSnapshot.valueGap)

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
            briCategory: true,
            normalizedValue: true,
          },
        })

        if (!topTask) {
          skipped++
          continue
        }

        // Count pending tasks
        const pendingTaskCount = await prisma.task.count({
          where: {
            companyId: company.id,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            inActionPlan: true,
          },
        })

        const daysSinceOnboarding = Math.floor(
          (now.getTime() - company.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )

        await sendTaskReminderEmail({
          email: owner.email,
          name: owner.name || undefined,
          companyName: company.name,
          valueGap,
          daysSinceOnboarding,
          topTask: {
            title: topTask.title,
            category: topTask.briCategory,
            estimatedValue: Number(topTask.normalizedValue),
          },
          pendingTaskCount,
        })

        sent++
      } catch (error) {
        console.error(`[TaskReminder] Error processing company ${company.id}:`, error instanceof Error ? error.message : String(error))
        errors++
      }
    }

    console.log(`[TaskReminder] Cron complete: ${sent} sent, ${skipped} skipped, ${errors} errors`)

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      errors,
      totalCompanies: companies.length,
    })
  } catch (error) {
    console.error('[TaskReminder] Cron error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to run task reminder cron' },
      { status: 500 }
    )
  }
}
