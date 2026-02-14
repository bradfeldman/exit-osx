import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { resolveBackendStage, type VisualStage } from '@/lib/deal-room/visual-stages'
import { DealStage } from '@prisma/client'

const VALID_VISUAL_STAGES: VisualStage[] = [
  'identified', 'engaged', 'under_nda', 'offer_received', 'diligence', 'closed',
]

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error
    const { auth } = result

    const body = await request.json()
    const { stage, action } = body

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
    console.error('Error updating buyer stage:', error)
    return NextResponse.json(
      { error: 'Failed to update buyer stage' },
      { status: 500 }
    )
  }
}
