import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { DealStage, ApprovalStatus } from '@prisma/client'

type RouteParams = Promise<{ dealId: string }>

// Exit stages
const EXIT_STAGES: DealStage[] = [
  DealStage.PASSED,
  DealStage.WITHDRAWN,
  DealStage.TERMINATED,
  DealStage.DECLINED,
  DealStage.IOI_DECLINED,
]

// Map stages to exit reasons
function getExitReason(stage: DealStage): string {
  switch (stage) {
    case DealStage.PASSED:
      return 'PASSED'
    case DealStage.WITHDRAWN:
      return 'WITHDRAWN'
    case DealStage.TERMINATED:
      return 'TERMINATED'
    case DealStage.DECLINED:
      return 'DECLINED'
    case DealStage.IOI_DECLINED:
      return 'IOI_DECLINED'
    default:
      return 'OTHER'
  }
}

// Human-readable stage labels for exit points
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

interface ExitData {
  buyer: {
    id: string
    createdAt: Date
    exitedAt: Date | null
    stageUpdatedAt: Date
    currentStage: DealStage
    exitReason: string | null
  }
  lastNonExitStage: DealStage | null
}

/**
 * GET /api/deals/[dealId]/analytics/exits
 * Get exit analysis data for a deal.
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

    // Get all exited buyers
    const exitedBuyers = await prisma.dealBuyer.findMany({
      where: {
        dealId,
        currentStage: {
          in: EXIT_STAGES,
        },
      },
      select: {
        id: true,
        currentStage: true,
        createdAt: true,
        exitedAt: true,
        stageUpdatedAt: true,
        exitReason: true,
      },
    })

    // Get stage history to find the last non-exit stage
    const buyerIds = exitedBuyers.map((b) => b.id)
    const stageHistory = await prisma.dealStageHistory2.findMany({
      where: {
        dealBuyerId: {
          in: buyerIds,
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
      select: {
        dealBuyerId: true,
        fromStage: true,
        toStage: true,
        changedAt: true,
      },
    })

    // Find last non-exit stage for each buyer
    const lastNonExitStages = new Map<string, DealStage>()
    for (const record of stageHistory) {
      if (lastNonExitStages.has(record.dealBuyerId)) continue
      if (record.fromStage && !EXIT_STAGES.includes(record.fromStage)) {
        lastNonExitStages.set(record.dealBuyerId, record.fromStage)
      }
    }

    // Group exits by reason
    const exitsByReason = new Map<
      string,
      {
        count: number
        totalDays: number
        stages: Map<DealStage, number>
      }
    >()

    const totalExits = exitedBuyers.length

    for (const buyer of exitedBuyers) {
      const reason = getExitReason(buyer.currentStage)
      const existing = exitsByReason.get(reason) || {
        count: 0,
        totalDays: 0,
        stages: new Map(),
      }

      existing.count++

      // Calculate days in process
      const exitDate = buyer.exitedAt || buyer.stageUpdatedAt
      const daysInProcess = Math.floor(
        (exitDate.getTime() - buyer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )
      existing.totalDays += daysInProcess

      // Track exit point (last stage before exit)
      const lastStage = lastNonExitStages.get(buyer.id)
      if (lastStage) {
        existing.stages.set(lastStage, (existing.stages.get(lastStage) || 0) + 1)
      }

      exitsByReason.set(reason, existing)
    }

    // Convert to array and calculate statistics
    const exits = Array.from(exitsByReason.entries())
      .map(([reason, data]) => {
        // Find most common exit point
        let mostCommonStage: DealStage | null = null
        let maxCount = 0
        for (const [stage, count] of data.stages.entries()) {
          if (count > maxCount) {
            maxCount = count
            mostCommonStage = stage
          }
        }

        return {
          reason,
          count: data.count,
          percentage:
            totalExits > 0 ? Math.round((data.count / totalExits) * 100) : 0,
          avgDaysInProcess:
            data.count > 0 ? Math.round(data.totalDays / data.count) : 0,
          stage: mostCommonStage ? STAGE_LABELS[mostCommonStage] : null,
        }
      })
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      exits,
      totalExits,
    })
  } catch (error) {
    console.error('Error fetching exit analysis data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exit analysis data' },
      { status: 500 }
    )
  }
}
