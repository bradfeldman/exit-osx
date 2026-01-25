import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DealStage } from '@prisma/client'
import { syncBuyerVDRAccess } from '@/lib/deal-tracker/vdr-sync'
import {
  ACTIVITY_TYPES,
  isValidTransition,
  STAGE_LABELS,
} from '@/lib/deal-tracker/constants'

/**
 * PUT /api/companies/[id]/deal-tracker/buyers/[buyerId]/stage
 * Change the stage of a prospective buyer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { stage, notes, skipValidation = false, ioiAmount, loiAmount } = body

    if (!stage) {
      return NextResponse.json({ error: 'Stage is required' }, { status: 400 })
    }

    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const fromStage = buyer.currentStage
    const toStage = stage as DealStage

    // Validate transition (unless explicitly skipped for admin override)
    if (!skipValidation && !isValidTransition(fromStage, toStage)) {
      return NextResponse.json(
        {
          error: `Invalid stage transition from ${STAGE_LABELS[fromStage]} to ${STAGE_LABELS[toStage]}`,
        },
        { status: 400 }
      )
    }

    // Build update data with key dates based on stage
    const updateData: Record<string, unknown> = {
      currentStage: toStage,
      stageUpdatedAt: new Date(),
    }

    // Set key dates based on stage
    if (toStage === DealStage.APPROVED) {
      updateData.approvedAt = new Date()
    } else if (toStage === DealStage.NDA_EXECUTED) {
      updateData.ndaExecutedAt = new Date()
    } else if (toStage === DealStage.IOI_RECEIVED) {
      updateData.ioiReceivedAt = new Date()
      if (ioiAmount !== undefined) updateData.ioiAmount = ioiAmount
    } else if (toStage === DealStage.LOI_RECEIVED) {
      updateData.loiReceivedAt = new Date()
      if (loiAmount !== undefined) updateData.loiAmount = loiAmount
    } else if (toStage === DealStage.CLOSED) {
      updateData.closedAt = new Date()
    } else if (toStage === DealStage.WITHDRAWN || toStage === DealStage.TERMINATED) {
      updateData.withdrawnAt = new Date()
    }

    // Update IOI/LOI amounts if provided
    if (ioiAmount !== undefined) updateData.ioiAmount = ioiAmount
    if (loiAmount !== undefined) updateData.loiAmount = loiAmount

    // Update buyer
    const updatedBuyer = await prisma.prospectiveBuyer.update({
      where: { id: buyerId },
      data: updateData,
      include: {
        contacts: {
          where: { isActive: true },
        },
      },
    })

    // Create stage history entry
    await prisma.dealStageHistory.create({
      data: {
        buyerId: buyerId,
        fromStage,
        toStage,
        notes,
        changedById: result.auth.user.id,
      },
    })

    // Log activity
    await prisma.dealActivity.create({
      data: {
        buyerId: buyerId,
        activityType: ACTIVITY_TYPES.STAGE_CHANGED,
        description: `Stage changed from ${STAGE_LABELS[fromStage]} to ${STAGE_LABELS[toStage]}`,
        metadata: {
          fromStage,
          toStage,
          notes,
          ioiAmount,
          loiAmount,
        },
        performedById: result.auth.user.id,
      },
    })

    // Sync VDR access for all contacts
    const vdrResult = await syncBuyerVDRAccess(
      buyerId,
      result.auth.user.id,
      result.auth.user.email
    )

    return NextResponse.json({
      buyer: updatedBuyer,
      vdrSync: vdrResult,
    })
  } catch (error) {
    console.error('Error changing stage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
