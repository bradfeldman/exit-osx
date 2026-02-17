import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { resolveBackendStage, type VisualStage } from '@/lib/deal-room/visual-stages'
import { DealStage } from '@prisma/client'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const VALID_VISUAL_STAGES: VisualStage[] = [
  'identified', 'engaged', 'under_nda', 'offer_received', 'diligence', 'closed',
]

const patchSchema = z.object({
  stage: z.enum(['identified', 'engaged', 'under_nda', 'offer_received', 'diligence', 'closed']).optional(),
  action: z.enum(['archive', 'restore']).optional(),
  internalNotes: z.string().max(5000).optional(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'HOLD', 'DENIED']).optional(),
  qualityScore: z.number().int().min(1).max(5).optional(),
  buyerType: z.enum(['STRATEGIC', 'FINANCIAL', 'INDIVIDUAL', 'MANAGEMENT', 'ESOP', 'OTHER']).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error
    const { auth } = result

    const validation = await validateRequestBody(request, patchSchema)
    if (!validation.success) return validation.error
    const { stage, action, internalNotes, approvalStatus, qualityScore, buyerType } = validation.data

    // Handle field updates (internalNotes, approvalStatus, qualityScore, buyerType)
    if (internalNotes !== undefined || approvalStatus !== undefined || qualityScore !== undefined || buyerType !== undefined) {
      const buyer = await prisma.dealBuyer.findFirst({
        where: {
          id: buyerId,
          deal: { companyId, status: 'ACTIVE' },
        },
      })

      if (!buyer) {
        return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
      }

      // Update DealBuyer fields
      const dealBuyerUpdates: Record<string, unknown> = {}
      if (internalNotes !== undefined) dealBuyerUpdates.internalNotes = internalNotes
      if (approvalStatus !== undefined) dealBuyerUpdates.approvalStatus = approvalStatus
      if (qualityScore !== undefined) dealBuyerUpdates.qualityScore = qualityScore

      if (Object.keys(dealBuyerUpdates).length > 0) {
        await prisma.dealBuyer.update({
          where: { id: buyerId },
          data: dealBuyerUpdates,
        })
      }

      // Update CanonicalCompany.companyType if buyerType provided
      if (buyerType !== undefined) {
        await prisma.canonicalCompany.update({
          where: { id: buyer.canonicalCompanyId },
          data: { companyType: buyerType },
        })
      }

      // If no stage/action change, return success now
      if (!stage && !action) {
        return NextResponse.json({ success: true })
      }
    }

    // Handle archive/restore actions
    if (action === 'archive' || action === 'restore') {
      const buyer = await prisma.dealBuyer.findFirst({
        where: {
          id: buyerId,
          deal: { companyId, status: 'ACTIVE' },
        },
        include: { deal: true },
      })

      if (!buyer) {
        return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
      }

      if (action === 'archive') {
        await prisma.dealBuyer.update({
          where: { id: buyerId },
          data: {
            currentStage: 'WITHDRAWN',
            exitedAt: new Date(),
            exitReason: 'Archived',
            stageUpdatedAt: new Date(),
          },
        })

        await prisma.dealActivity2.create({
          data: {
            dealId: buyer.dealId,
            dealBuyerId: buyerId,
            activityType: 'STAGE_CHANGED',
            subject: 'Buyer archived',
            performedByUserId: auth.user.id,
          },
        })

        return NextResponse.json({ success: true, stage: 'WITHDRAWN' })
      }

      // Restore: move back to IDENTIFIED
      await prisma.dealBuyer.update({
        where: { id: buyerId },
        data: {
          currentStage: 'IDENTIFIED',
          exitedAt: null,
          exitReason: null,
          stageUpdatedAt: new Date(),
        },
      })

      await prisma.dealActivity2.create({
        data: {
          dealId: buyer.dealId,
          dealBuyerId: buyerId,
          activityType: 'STAGE_CHANGED',
          subject: 'Buyer restored from archive',
          performedByUserId: auth.user.id,
        },
      })

      return NextResponse.json({ success: true, stage: 'IDENTIFIED' })
    }

    // Handle stage changes
    if (!stage || !VALID_VISUAL_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: 'Invalid stage. Must be one of: ' + VALID_VISUAL_STAGES.join(', ') },
        { status: 400 }
      )
    }

    // Verify buyer belongs to an active deal for this company
    const buyer = await prisma.dealBuyer.findFirst({
      where: {
        id: buyerId,
        deal: { companyId, status: 'ACTIVE' },
      },
      include: { deal: true },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Resolve the visual stage to a backend DealStage
    const backendStage = resolveBackendStage(
      buyer.currentStage as DealStage,
      stage as VisualStage,
      {
        hasIOI: !!buyer.ioiAmount,
        hasLOI: !!buyer.loiAmount,
      }
    )

    // Update the buyer's stage
    await prisma.dealBuyer.update({
      where: { id: buyerId },
      data: {
        currentStage: backendStage,
        stageUpdatedAt: new Date(),
      },
    })

    // Log activity
    await prisma.dealActivity2.create({
      data: {
        dealId: buyer.dealId,
        dealBuyerId: buyerId,
        activityType: 'STAGE_CHANGED',
        subject: `Stage changed to ${stage.replace(/_/g, ' ')}`,
        performedByUserId: auth.user.id,
      },
    })

    return NextResponse.json({ success: true, stage: backendStage })
  } catch (error) {
    console.error('Error updating buyer stage:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to update buyer stage' },
      { status: 500 }
    )
  }
}
