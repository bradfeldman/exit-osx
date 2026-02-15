import { NextRequest, NextResponse } from 'next/server'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'
import { prisma } from '@/lib/prisma'
import { getTimeInStages, STAGE_LABELS } from '@/lib/contact-system/stage-service'

/**
 * GET /api/deals/[dealId]/buyers/[buyerId]/history
 * Get stage transition history and time analytics for a buyer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; buyerId: string }> }
) {
  const { dealId, buyerId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
  if (authResult instanceof NextResponse) return authResult

  try {
    // Verify buyer exists and belongs to deal
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      select: {
        id: true,
        dealId: true,
        currentStage: true,
        createdAt: true,
        teaserSentAt: true,
        ndaExecutedAt: true,
        cimAccessAt: true,
        ioiReceivedAt: true,
        loiReceivedAt: true,
        closedAt: true,
        exitedAt: true,
        exitReason: true,
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
    }

    // Get full stage history
    const history = await prisma.dealStageHistory2.findMany({
      where: { dealBuyerId: buyerId },
      orderBy: { changedAt: 'desc' },
    })

    // Get time in stages analytics
    const timeInStages = await getTimeInStages(buyerId)

    // Format history with labels
    const formattedHistory = history.map((entry) => ({
      id: entry.id,
      fromStage: entry.fromStage,
      fromStageLabel: entry.fromStage ? STAGE_LABELS[entry.fromStage] : null,
      toStage: entry.toStage,
      toStageLabel: STAGE_LABELS[entry.toStage],
      note: entry.note,
      changedAt: entry.changedAt,
      changedByUserId: entry.changedByUserId,
    }))

    // Format time in stages with labels
    const formattedTimeInStages = timeInStages.map((entry) => ({
      stage: entry.stage,
      stageLabel: STAGE_LABELS[entry.stage],
      enteredAt: entry.enteredAt,
      exitedAt: entry.exitedAt,
      durationDays: entry.durationDays,
    }))

    // Calculate summary metrics
    const totalDays = buyer.closedAt || buyer.exitedAt
      ? Math.round(
          ((buyer.closedAt || buyer.exitedAt)!.getTime() - buyer.createdAt.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : Math.round((Date.now() - buyer.createdAt.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      currentStage: buyer.currentStage,
      currentStageLabel: STAGE_LABELS[buyer.currentStage],
      history: formattedHistory,
      timeInStages: formattedTimeInStages,
      milestones: {
        added: buyer.createdAt,
        teaserSent: buyer.teaserSentAt,
        ndaExecuted: buyer.ndaExecutedAt,
        cimAccess: buyer.cimAccessAt,
        ioiReceived: buyer.ioiReceivedAt,
        loiReceived: buyer.loiReceivedAt,
        closed: buyer.closedAt,
        exited: buyer.exitedAt,
        exitReason: buyer.exitReason,
      },
      summary: {
        totalTransitions: history.length,
        totalDaysInProcess: totalDays,
        isActive: !buyer.closedAt && !buyer.exitedAt,
      },
    })
  } catch (error) {
    console.error('Error fetching buyer history:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
