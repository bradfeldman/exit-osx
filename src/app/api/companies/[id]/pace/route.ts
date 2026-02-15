import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

interface PaceData {
  monthlyCompletionRate: number
  averageValuePerTask: number
  projectedMonthsToClose: number | null
  remainingValueGap: number
  hasEnoughHistory: boolean
  tasksCompleted: number
  earliestCompletionDate: string | null
  latestCompletionDate: string | null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    // Get current value gap
    const latestSnapshot = await prisma.valuationSnapshot.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { valueGap: true },
    })

    const remainingValueGap = latestSnapshot ? Number(latestSnapshot.valueGap) : 0

    // Get completed tasks from the last 3+ months
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const completedTasks = await prisma.task.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        completedAt: {
          gte: threeMonthsAgo,
          not: null,
        },
      },
      select: {
        completedAt: true,
        completedValue: true,
        normalizedValue: true,
      },
      orderBy: { completedAt: 'asc' },
    })

    // Early exit if not enough history
    if (completedTasks.length === 0) {
      return NextResponse.json({
        monthlyCompletionRate: 0,
        averageValuePerTask: 0,
        projectedMonthsToClose: null,
        remainingValueGap,
        hasEnoughHistory: false,
        tasksCompleted: 0,
        earliestCompletionDate: null,
        latestCompletionDate: null,
      } satisfies PaceData)
    }

    const earliestDate = completedTasks[0].completedAt!
    const latestDate = completedTasks[completedTasks.length - 1].completedAt!

    // Calculate time span in months
    const millisecondsPerMonth = 1000 * 60 * 60 * 24 * 30.44 // Average month length
    const timeSpanMonths = (latestDate.getTime() - earliestDate.getTime()) / millisecondsPerMonth

    // Need at least 3 months of history for meaningful projection
    const hasEnoughHistory = timeSpanMonths >= 3

    // Calculate monthly completion rate
    const monthlyCompletionRate = timeSpanMonths > 0
      ? completedTasks.length / timeSpanMonths
      : 0

    // Calculate average value per task
    const totalValue = completedTasks.reduce(
      (sum, task) => sum + Number(task.completedValue ?? task.normalizedValue ?? 0),
      0
    )
    const averageValuePerTask = completedTasks.length > 0
      ? totalValue / completedTasks.length
      : 0

    // Calculate projected months to close value gap
    const monthlyValuePace = monthlyCompletionRate * averageValuePerTask
    const projectedMonthsToClose = monthlyValuePace > 0 && remainingValueGap > 0
      ? remainingValueGap / monthlyValuePace
      : null

    return NextResponse.json({
      monthlyCompletionRate,
      averageValuePerTask,
      projectedMonthsToClose,
      remainingValueGap,
      hasEnoughHistory,
      tasksCompleted: completedTasks.length,
      earliestCompletionDate: earliestDate.toISOString(),
      latestCompletionDate: latestDate.toISOString(),
    } satisfies PaceData)
  } catch (error) {
    console.error('Error calculating pace data:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to calculate pace data' },
      { status: 500 }
    )
  }
}
