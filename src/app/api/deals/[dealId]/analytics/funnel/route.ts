import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DealStage, ApprovalStatus } from '@prisma/client'

type RouteParams = Promise<{ dealId: string }>

// Stage order for funnel (only active/progressive stages)
const FUNNEL_STAGES: DealStage[] = [
  DealStage.IDENTIFIED,
  DealStage.APPROVED,
  DealStage.TEASER_SENT,
  DealStage.NDA_EXECUTED,
  DealStage.CIM_ACCESS,
  DealStage.MANAGEMENT_MEETING_COMPLETED,
  DealStage.IOI_RECEIVED,
  DealStage.LOI_RECEIVED,
  DealStage.DUE_DILIGENCE,
  DealStage.CLOSED,
]

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

// Get stage index for comparison
function getStageIndex(stage: DealStage): number {
  const index = FUNNEL_STAGES.indexOf(stage)
  // For stages not in funnel, map to closest funnel stage
  if (index === -1) {
    // Map intermediate stages to their funnel equivalent
    switch (stage) {
      case DealStage.SELLER_REVIEWING:
        return FUNNEL_STAGES.indexOf(DealStage.IDENTIFIED)
      case DealStage.INTERESTED:
      case DealStage.NDA_SENT:
      case DealStage.NDA_NEGOTIATING:
        return FUNNEL_STAGES.indexOf(DealStage.TEASER_SENT)
      case DealStage.LEVEL_2_ACCESS:
      case DealStage.LEVEL_3_ACCESS:
        return FUNNEL_STAGES.indexOf(DealStage.CIM_ACCESS)
      case DealStage.MANAGEMENT_MEETING_SCHEDULED:
        return FUNNEL_STAGES.indexOf(DealStage.CIM_ACCESS)
      case DealStage.IOI_REQUESTED:
        return FUNNEL_STAGES.indexOf(DealStage.MANAGEMENT_MEETING_COMPLETED)
      case DealStage.IOI_ACCEPTED:
        return FUNNEL_STAGES.indexOf(DealStage.IOI_RECEIVED)
      case DealStage.LOI_REQUESTED:
        return FUNNEL_STAGES.indexOf(DealStage.IOI_RECEIVED)
      case DealStage.LOI_SELECTED:
      case DealStage.LOI_BACKUP:
        return FUNNEL_STAGES.indexOf(DealStage.LOI_RECEIVED)
      case DealStage.PA_DRAFTING:
      case DealStage.PA_NEGOTIATING:
      case DealStage.CLOSING:
        return FUNNEL_STAGES.indexOf(DealStage.DUE_DILIGENCE)
      default:
        return -1 // Exit stages
    }
  }
  return index
}

/**
 * GET /api/deals/[dealId]/analytics/funnel
 * Get pipeline funnel data for a deal.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { dealId } = await params

    // Get all approved buyers for this deal
    const buyers = await prisma.dealBuyer.findMany({
      where: {
        dealId,
        approvalStatus: ApprovalStatus.APPROVED,
      },
      select: {
        id: true,
        currentStage: true,
      },
    })

    const totalBuyers = buyers.length

    // Exit stages that don't count toward the funnel
    const exitStages: DealStage[] = [
      DealStage.PASSED,
      DealStage.WITHDRAWN,
      DealStage.TERMINATED,
      DealStage.DECLINED,
      DealStage.IOI_DECLINED,
    ]

    // Count buyers at or past each funnel stage
    const funnelData = FUNNEL_STAGES.map((stage, stageIndex) => {
      // Count buyers whose current stage is at or past this stage
      const count = buyers.filter((buyer) => {
        // Exclude exit stages
        if (exitStages.includes(buyer.currentStage)) {
          return false
        }
        const buyerStageIndex = getStageIndex(buyer.currentStage)
        return buyerStageIndex >= stageIndex
      }).length

      return {
        stage: STAGE_LABELS[stage],
        count,
        percentage: totalBuyers > 0 ? Math.round((count / totalBuyers) * 100) : 0,
        dropoffRate: 0, // Calculated below
      }
    })

    // Calculate drop-off rates
    for (let i = 1; i < funnelData.length; i++) {
      const prev = funnelData[i - 1].count
      const curr = funnelData[i].count
      funnelData[i].dropoffRate = prev > 0 ? Math.round(((prev - curr) / prev) * 100) : 0
    }

    return NextResponse.json({
      stages: funnelData,
      totalBuyers,
    })
  } catch (error) {
    console.error('Error fetching funnel data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funnel data' },
      { status: 500 }
    )
  }
}
