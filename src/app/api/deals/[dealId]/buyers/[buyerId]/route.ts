import { NextRequest, NextResponse } from 'next/server'
import { authorizeDealAccess } from '@/lib/deal-tracker/deal-auth'
import { prisma } from '@/lib/prisma'
import { ApprovalStatus } from '@prisma/client'
import { revokeVDRAccessForBuyer } from '@/lib/contact-system/stage-service'

/**
 * GET /api/deals/[dealId]/buyers/[buyerId]
 * Get a single buyer with full details
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
      include: {
        deal: {
          select: {
            id: true,
            codeName: true,
            status: true,
            company: {
              select: { id: true, name: true },
            },
          },
        },
        canonicalCompany: {
          select: {
            id: true,
            name: true,
            companyType: true,
            website: true,
            linkedInUrl: true,
            description: true,
            dataQuality: true,
          },
        },
        contacts: {
          include: {
            canonicalPerson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                currentTitle: true,
                linkedInUrl: true,
              },
            },
            dataRoomAccess: {
              select: {
                id: true,
                maxStage: true,
                accessLevel: true,
              },
            },
          },
          orderBy: [
            { isPrimary: 'desc' },
            { createdAt: 'asc' },
          ],
        },
        stageHistory: {
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            contacts: true,
            stageHistory: true,
            activities: true,
          },
        },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Verify buyer belongs to the deal
    if (buyer.dealId !== dealId) {
      return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
    }

    return NextResponse.json({ buyer })
  } catch (error) {
    console.error('Error fetching deal buyer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/deals/[dealId]/buyers/[buyerId]
 * Update buyer details (not stage - use /stage endpoint)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; buyerId: string }> }
) {
  const { dealId, buyerId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult
  const { auth } = authResult

  try {
    const existing = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    if (existing.dealId !== dealId) {
      return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
    }

    const body = await request.json()
    const {
      approvalStatus,
      approvalNotes,
      internalNotes,
      ioiAmount,
      loiAmount,
      isPriority,
    } = body

    const updateData: Record<string, unknown> = {}

    // Handle approval status change
    if (approvalStatus !== undefined) {
      updateData.approvalStatus = approvalStatus as ApprovalStatus

      if (approvalStatus === ApprovalStatus.APPROVED) {
        updateData.approvedAt = new Date()
        updateData.approvedByUserId = auth.user.id
      } else if (approvalStatus === ApprovalStatus.DENIED) {
        updateData.approvedAt = new Date()
        updateData.approvedByUserId = auth.user.id
      }
    }

    if (approvalNotes !== undefined) updateData.approvalNotes = approvalNotes
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes
    if (ioiAmount !== undefined) updateData.ioiAmount = ioiAmount
    if (loiAmount !== undefined) updateData.loiAmount = loiAmount
    if (isPriority !== undefined) updateData.isPriority = isPriority

    const buyer = await prisma.dealBuyer.update({
      where: { id: buyerId },
      data: updateData,
      include: {
        canonicalCompany: {
          select: { id: true, name: true, companyType: true },
        },
      },
    })

    // Log approval status changes
    if (approvalStatus !== undefined && approvalStatus !== existing.approvalStatus) {
      await prisma.dealActivity2.create({
        data: {
          dealId,
          dealBuyerId: buyerId,
          activityType: 'NOTE_ADDED',
          subject: `Approval status changed to ${approvalStatus}`,
          description: approvalNotes,
          performedByUserId: auth.user.id,
        },
      })
    }

    return NextResponse.json({ buyer })
  } catch (error) {
    console.error('Error updating deal buyer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/deals/[dealId]/buyers/[buyerId]
 * Remove a buyer from a deal
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string; buyerId: string }> }
) {
  const { dealId, buyerId } = await params
  const authResult = await authorizeDealAccess(dealId, 'COMPANY_UPDATE')
  if (authResult instanceof NextResponse) return authResult
  const { auth } = authResult

  try {
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      include: {
        canonicalCompany: { select: { name: true } },
        contacts: { include: { dataRoomAccess: true } },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json({ error: 'Buyer not found in this deal' }, { status: 404 })
    }

    // Revoke VDR access before deletion
    await revokeVDRAccessForBuyer(buyerId, auth.user.id)

    // Delete related records and buyer in transaction
    await prisma.$transaction(async (tx) => {
      // Delete stage history
      await tx.dealStageHistory2.deleteMany({
        where: { dealBuyerId: buyerId },
      })

      // Delete activities
      await tx.dealActivity2.deleteMany({
        where: { dealBuyerId: buyerId },
      })

      // Delete contacts
      await tx.dealContact.deleteMany({
        where: { dealBuyerId: buyerId },
      })

      // Delete buyer
      await tx.dealBuyer.delete({
        where: { id: buyerId },
      })
    })

    return NextResponse.json({
      deleted: true,
      buyerName: buyer.canonicalCompany.name,
    })
  } catch (error) {
    console.error('Error deleting deal buyer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
