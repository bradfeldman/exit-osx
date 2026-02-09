import { prisma } from '@/lib/prisma'
import type { EngagementSection } from '../types'

export async function buildEngagementSection(companyId: string): Promise<EngagementSection> {
  // Get check-ins ordered by date
  const checkIns = await prisma.weeklyCheckIn.findMany({
    where: { companyId },
    orderBy: { weekOf: 'desc' },
    select: {
      completedAt: true,
      skippedAt: true,
      weekOf: true,
    },
  })

  const completedCheckIns = checkIns.filter(c => c.completedAt)
  const lastCheckIn = completedCheckIns[0]

  // Calculate streak (consecutive completed check-ins)
  let streak = 0
  for (const checkIn of checkIns) {
    if (checkIn.completedAt) {
      streak++
    } else {
      break
    }
  }

  // Days since last activity (check-in, task completion, or evidence upload)
  const [lastTask, lastDocument] = await Promise.all([
    prisma.task.findFirst({
      where: { companyId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
    }),
    prisma.dataRoomDocument.findFirst({
      where: { companyId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    }),
  ])

  const activityDates = [
    lastCheckIn?.completedAt,
    lastTask?.completedAt,
    lastDocument?.updatedAt,
  ].filter(Boolean) as Date[]

  const latestActivity = activityDates.length > 0
    ? new Date(Math.max(...activityDates.map(d => d.getTime())))
    : null

  const daysSinceLastActivity = latestActivity
    ? Math.floor((Date.now() - latestActivity.getTime()) / (24 * 60 * 60 * 1000))
    : 999

  // Latest drift report
  const latestDrift = await prisma.driftReport.findFirst({
    where: { companyId },
    orderBy: { periodEnd: 'desc' },
    select: { summary: true },
  })

  return {
    lastCheckInDate: lastCheckIn?.completedAt?.toISOString() ?? null,
    checkInStreak: streak,
    daysSinceLastActivity,
    latestDriftReportSummary: latestDrift?.summary ?? null,
    totalCheckIns: completedCheckIns.length,
  }
}
