import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { DealStage } from '@prisma/client'

type RouteParams = Promise<{ dealId: string }>

// Human-readable stage labels
const STAGE_LABELS: Record<DealStage, string> = {
  [DealStage.IDENTIFIED]: 'Identified',
  [DealStage.SELLER_REVIEWING]: 'Seller Reviewing',
  [DealStage.APPROVED]: 'Approved',
  [DealStage.DECLINED]: 'Declined',
  [DealStage.TEASER_SENT]: 'Teaser Sent',
  [DealStage.INTERESTED]: 'Interested',
  [DealStage.PASSED]: 'Passed',
  [DealStage.NDA_SENT]: 'NDA Sent',
  [DealStage.NDA_NEGOTIATING]: 'NDA Negotiating',
  [DealStage.NDA_EXECUTED]: 'NDA Executed',
  [DealStage.CIM_ACCESS]: 'CIM Access',
  [DealStage.LEVEL_2_ACCESS]: 'Level 2 Access',
  [DealStage.LEVEL_3_ACCESS]: 'Level 3 Access',
  [DealStage.MANAGEMENT_MEETING_SCHEDULED]: 'Meeting Scheduled',
  [DealStage.MANAGEMENT_MEETING_COMPLETED]: 'Meeting Completed',
  [DealStage.IOI_REQUESTED]: 'IOI Requested',
  [DealStage.IOI_RECEIVED]: 'IOI Received',
  [DealStage.IOI_ACCEPTED]: 'IOI Accepted',
  [DealStage.IOI_DECLINED]: 'IOI Declined',
  [DealStage.LOI_REQUESTED]: 'LOI Requested',
  [DealStage.LOI_RECEIVED]: 'LOI Received',
  [DealStage.LOI_SELECTED]: 'LOI Selected',
  [DealStage.LOI_BACKUP]: 'LOI Backup',
  [DealStage.DUE_DILIGENCE]: 'Due Diligence',
  [DealStage.PA_DRAFTING]: 'PA Drafting',
  [DealStage.PA_NEGOTIATING]: 'PA Negotiating',
  [DealStage.CLOSING]: 'Closing',
  [DealStage.CLOSED]: 'Closed',
  [DealStage.WITHDRAWN]: 'Withdrawn',
  [DealStage.TERMINATED]: 'Terminated',
}

// Key stages for time analysis
const KEY_STAGES: DealStage[] = [
  DealStage.APPROVED,
  DealStage.TEASER_SENT,
  DealStage.NDA_EXECUTED,
  DealStage.CIM_ACCESS,
  DealStage.MANAGEMENT_MEETING_COMPLETED,
  DealStage.IOI_RECEIVED,
  DealStage.LOI_RECEIVED,
  DealStage.DUE_DILIGENCE,
]

interface StageTimeData {
  stage: DealStage
  durations: number[] // Days spent in this stage before moving on
}

/**
 * GET /api/deals/[dealId]/analytics/time-in-stage
 * Get time spent in each stage for a deal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  // SECURITY FIX (PROD-060): Was completely unauthenticated — anyone could access deal analytics.
  const result = await checkPermission('COMPANY_VIEW')
  if (isAuthError(result)) return result.error

  try {
    const { dealId } = await params

    // Get all stage history for buyers in this deal
    const stageHistory = await prisma.dealStageHistory2.findMany({
      where: {
        dealBuyer: {
          dealId,
        },
      },
      orderBy: {
        changedAt: 'asc',
      },
      select: {
        id: true,
        dealBuyerId: true,
        fromStage: true,
        toStage: true,
        changedAt: true,
      },
    })

    // Group by buyer to calculate time in each stage
    const buyerHistories = new Map<string, typeof stageHistory>()
    for (const record of stageHistory) {
      const existing = buyerHistories.get(record.dealBuyerId) || []
      existing.push(record)
      buyerHistories.set(record.dealBuyerId, existing)
    }

    // Calculate time spent in each stage
    const stageTimeMap = new Map<DealStage, number[]>()

    for (const history of buyerHistories.values()) {
      // Sort by date
      history.sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())

      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i]
        const next = history[i + 1]

        const daysInStage = Math.floor(
          (next.changedAt.getTime() - current.changedAt.getTime()) / (1000 * 60 * 60 * 24)
        )

        const stage = current.toStage
        if (KEY_STAGES.includes(stage)) {
          const existing = stageTimeMap.get(stage) || []
          existing.push(daysInStage)
          stageTimeMap.set(stage, existing)
        }
      }
    }

    // For buyers still in a stage, calculate time from last transition
    const activeBuyers = await prisma.dealBuyer.findMany({
      where: { dealId },
      select: {
        id: true,
        currentStage: true,
        stageUpdatedAt: true,
      },
    })

    const now = new Date()
    for (const buyer of activeBuyers) {
      if (KEY_STAGES.includes(buyer.currentStage)) {
        const daysInStage = Math.floor(
          (now.getTime() - buyer.stageUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        const existing = stageTimeMap.get(buyer.currentStage) || []
        existing.push(daysInStage)
        stageTimeMap.set(buyer.currentStage, existing)
      }
    }

    // Calculate statistics for each stage
    const stages = KEY_STAGES
      .filter(stage => stageTimeMap.has(stage))
      .map(stage => {
        const durations = stageTimeMap.get(stage) || []
        const sorted = [...durations].sort((a, b) => a - b)
        const sum = durations.reduce((a, b) => a + b, 0)
        const avg = durations.length > 0 ? Math.round(sum / durations.length) : 0
        const median =
          durations.length > 0
            ? durations.length % 2 === 0
              ? Math.round((sorted[durations.length / 2 - 1] + sorted[durations.length / 2]) / 2)
              : sorted[Math.floor(durations.length / 2)]
            : 0
        const min = durations.length > 0 ? Math.min(...durations) : 0
        const max = durations.length > 0 ? Math.max(...durations) : 0

        // Trend: compare recent vs older (simplified)
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (durations.length >= 4) {
          const half = Math.floor(durations.length / 2)
          const oldAvg = durations.slice(0, half).reduce((a, b) => a + b, 0) / half
          const newAvg = durations.slice(half).reduce((a, b) => a + b, 0) / (durations.length - half)
          if (newAvg > oldAvg * 1.1) trend = 'up'
          else if (newAvg < oldAvg * 0.9) trend = 'down'
        }

        return {
          stage: STAGE_LABELS[stage],
          avgDays: avg,
          medianDays: median,
          minDays: min,
          maxDays: max,
          sampleSize: durations.length,
          trend,
        }
      })

    return NextResponse.json({
      stages,
    })
  } catch (error) {
    console.error('Error fetching time in stage data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time in stage data' },
      { status: 500 }
    )
  }
}
