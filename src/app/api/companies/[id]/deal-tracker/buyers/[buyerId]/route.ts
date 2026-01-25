import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { BuyerType, BuyerTier, DealStage } from '@prisma/client'
import { syncBuyerVDRAccess as _syncBuyerVDRAccess } from '@/lib/deal-tracker/vdr-sync'
import { ACTIVITY_TYPES } from '@/lib/deal-tracker/constants'

/**
 * GET /api/companies/[id]/deal-tracker/buyers/[buyerId]
 * Get a single prospective buyer with full details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
      include: {
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          include: {
            dataRoomAccess: {
              select: {
                id: true,
                maxStage: true,
                accessLevel: true,
                createdAt: true,
              },
            },
          },
        },
        stageHistory: {
          orderBy: { changedAt: 'desc' },
          take: 50,
        },
        activities: {
          orderBy: { performedAt: 'desc' },
          take: 50,
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        meetings: {
          orderBy: { scheduledAt: 'desc' },
        },
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    return NextResponse.json({ buyer })
  } catch (error) {
    console.error('Error fetching buyer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/companies/[id]/deal-tracker/buyers/[buyerId]
 * Update a prospective buyer
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
    const {
      name,
      buyerType,
      tier,
      website,
      description,
      industry,
      location,
      internalNotes,
      tags,
      ioiAmount,
      loiAmount,
      ioiDeadline,
      loiDeadline,
      exclusivityStart,
      exclusivityEnd,
      approvalStatus,
      approvalNotes,
    } = body

    // Verify buyer belongs to company
    const existing = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Check for duplicate name if changing
    if (name && name !== existing.name) {
      const duplicate = await prisma.prospectiveBuyer.findUnique({
        where: {
          companyId_name: { companyId, name },
        },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A buyer with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (buyerType !== undefined) updateData.buyerType = buyerType as BuyerType
    if (tier !== undefined) updateData.tier = tier as BuyerTier
    if (website !== undefined) updateData.website = website
    if (description !== undefined) updateData.description = description
    if (industry !== undefined) updateData.industry = industry
    if (location !== undefined) updateData.location = location
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes
    if (tags !== undefined) updateData.tags = tags
    if (ioiAmount !== undefined) updateData.ioiAmount = ioiAmount
    if (loiAmount !== undefined) updateData.loiAmount = loiAmount
    if (ioiDeadline !== undefined) updateData.ioiDeadline = ioiDeadline ? new Date(ioiDeadline) : null
    if (loiDeadline !== undefined) updateData.loiDeadline = loiDeadline ? new Date(loiDeadline) : null
    if (exclusivityStart !== undefined) updateData.exclusivityStart = exclusivityStart ? new Date(exclusivityStart) : null
    if (exclusivityEnd !== undefined) updateData.exclusivityEnd = exclusivityEnd ? new Date(exclusivityEnd) : null

    // Handle approval status changes
    if (approvalStatus !== undefined) {
      updateData.approvalStatus = approvalStatus
      updateData.approvalNotes = approvalNotes
      updateData.approvalById = result.auth.user.id

      if (approvalStatus === 'APPROVED' && existing.currentStage === DealStage.SELLER_REVIEWING) {
        updateData.currentStage = DealStage.APPROVED
        updateData.stageUpdatedAt = new Date()
        updateData.approvedAt = new Date()
      } else if (approvalStatus === 'DECLINED' && existing.currentStage === DealStage.SELLER_REVIEWING) {
        updateData.currentStage = DealStage.DECLINED
        updateData.stageUpdatedAt = new Date()
      }
    }

    const buyer = await prisma.prospectiveBuyer.update({
      where: { id: buyerId },
      data: updateData,
      include: {
        contacts: {
          where: { isActive: true },
        },
      },
    })

    // If approval status changed, create activity log
    if (approvalStatus && approvalStatus !== existing.approvalStatus) {
      await prisma.dealActivity.create({
        data: {
          buyerId: buyer.id,
          activityType: approvalStatus === 'APPROVED'
            ? ACTIVITY_TYPES.APPROVAL_GRANTED
            : approvalStatus === 'DECLINED'
            ? ACTIVITY_TYPES.APPROVAL_DENIED
            : ACTIVITY_TYPES.APPROVAL_REQUESTED,
          description: `Buyer ${approvalStatus === 'APPROVED' ? 'approved' : approvalStatus === 'DECLINED' ? 'declined' : 'pending approval'}`,
          metadata: { approvalStatus, approvalNotes },
          performedById: result.auth.user.id,
        },
      })

      // If stage changed due to approval, log it
      if (updateData.currentStage) {
        await prisma.dealStageHistory.create({
          data: {
            buyerId: buyer.id,
            fromStage: existing.currentStage,
            toStage: updateData.currentStage as DealStage,
            notes: approvalNotes,
            changedById: result.auth.user.id,
          },
        })
      }
    }

    return NextResponse.json({ buyer })
  } catch (error) {
    console.error('Error updating buyer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/deal-tracker/buyers/[buyerId]
 * Delete a prospective buyer
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
      include: {
        contacts: true,
      },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    // Revoke VDR access for all contacts first
    for (const contact of buyer.contacts) {
      if (contact.dataRoomAccessId) {
        await prisma.dataRoomAccess.delete({
          where: { id: contact.dataRoomAccessId },
        }).catch(() => {
          // Ignore if already deleted
        })
      }
    }

    // Delete the buyer (cascade will handle related records)
    await prisma.prospectiveBuyer.delete({
      where: { id: buyerId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting buyer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
