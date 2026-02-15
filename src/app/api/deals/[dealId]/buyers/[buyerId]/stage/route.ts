import { NextRequest, NextResponse } from 'next/server'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'
import { prisma } from '@/lib/prisma'
import { DealStage, ApprovalStatus } from '@prisma/client'
import {
  transitionStage,
  getValidNextStages,
  STAGE_LABELS,
} from '@/lib/contact-system/stage-service'

/**
 * GET /api/deals/[dealId]/buyers/[buyerId]/stage
 * Get current stage info and valid next stages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; buyerId: string }> }
) {
  const { dealId, buyerId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_VIEW')
  if (authResult instanceof NextResponse) return authResult

  try {
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      select: {
        id: true,
        dealId: true,
        currentStage: true,
        stageUpdatedAt: true,
        approvalStatus: true,
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
    }

    const validNextStages = getValidNextStages(buyer.currentStage)

    return NextResponse.json({
      currentStage: buyer.currentStage,
      currentStageLabel: STAGE_LABELS[buyer.currentStage],
      stageUpdatedAt: buyer.stageUpdatedAt,
      approvalStatus: buyer.approvalStatus,
      validNextStages: validNextStages.map((stage) => ({
        stage,
        label: STAGE_LABELS[stage],
      })),
      canTransition: buyer.approvalStatus === ApprovalStatus.APPROVED && validNextStages.length > 0,
    })
  } catch (error) {
    console.error('Error getting stage info:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/deals/[dealId]/buyers/[buyerId]/stage
 * Transition buyer to a new stage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; buyerId: string }> }
) {
  const { dealId, buyerId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult
  const { auth } = authResult

  try {
    // Verify buyer exists and belongs to deal
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      include: {
        deal: { select: { status: true } },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
    }

    // Check deal is active
    if (buyer.deal.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot change stages on a non-active deal' },
        { status: 400 }
      )
    }

    // Check approval status
    if (buyer.approvalStatus !== ApprovalStatus.APPROVED) {
      return NextResponse.json(
        {
          error: 'Buyer must be approved before stage transitions',
          approvalStatus: buyer.approvalStatus,
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { toStage, note, skipValidation, ioiAmount, loiAmount } = body

    if (!toStage) {
      return NextResponse.json(
        { error: 'Target stage is required' },
        { status: 400 }
      )
    }

    // Validate stage is a valid enum value
    if (!Object.values(DealStage).includes(toStage)) {
      return NextResponse.json(
        { error: `Invalid stage: ${toStage}` },
        { status: 400 }
      )
    }

    // Perform transition
    const transitionResult = await transitionStage({
      dealBuyerId: buyerId,
      toStage: toStage as DealStage,
      note,
      skipValidation: skipValidation === true,
      ioiAmount,
      loiAmount,
      performedByUserId: auth.user.id,
    })

    if (!transitionResult.success) {
      return NextResponse.json(
        {
          error: transitionResult.error,
          fromStage: transitionResult.fromStage,
          toStage: transitionResult.toStage,
        },
        { status: 400 }
      )
    }

    // Get updated buyer
    const updatedBuyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      include: {
        canonicalCompany: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      buyer: updatedBuyer,
      transition: {
        fromStage: transitionResult.fromStage,
        fromStageLabel: STAGE_LABELS[transitionResult.fromStage],
        toStage: transitionResult.toStage,
        toStageLabel: STAGE_LABELS[transitionResult.toStage],
        vdrAccessUpdated: transitionResult.vdrAccessUpdated,
        activityLogId: transitionResult.activityLogId,
      },
      nextValidStages: getValidNextStages(transitionResult.toStage).map((stage) => ({
        stage,
        label: STAGE_LABELS[stage],
      })),
    })
  } catch (error) {
    console.error('Error transitioning stage:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
