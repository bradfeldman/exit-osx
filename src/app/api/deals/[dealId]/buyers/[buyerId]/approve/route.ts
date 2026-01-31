import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApprovalStatus, ActivityType } from '@prisma/client'

type RouteParams = Promise<{ dealId: string; buyerId: string }>

/**
 * POST /api/deals/[dealId]/buyers/[buyerId]/approve
 * Change approval status for a buyer.
 *
 * Body:
 * - status: 'APPROVED' | 'DENIED' | 'HOLD' | 'PENDING'
 * - note?: string (required for DENIED)
 * - userId: string (who is making the change)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { dealId, buyerId } = await params
    const body = await request.json()
    const { status, note, userId } = body

    // Validate status
    if (!status || !Object.values(ApprovalStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED, DENIED, HOLD, or PENDING' },
        { status: 400 }
      )
    }

    // Require reason for denial
    if (status === ApprovalStatus.DENIED && !note) {
      return NextResponse.json(
        { error: 'A reason is required when denying a buyer' },
        { status: 400 }
      )
    }

    // Get the current buyer
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      include: {
        canonicalCompany: {
          select: { name: true }
        },
        deal: {
          select: { codeName: true }
        }
      }
    })

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer not found' },
        { status: 404 }
      )
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json(
        { error: 'Buyer does not belong to this deal' },
        { status: 400 }
      )
    }

    const previousStatus = buyer.approvalStatus

    // Update the buyer approval status
    const updatedBuyer = await prisma.dealBuyer.update({
      where: { id: buyerId },
      data: {
        approvalStatus: status as ApprovalStatus,
        approvalNote: note || null,
        approvedAt: status === ApprovalStatus.APPROVED ? new Date() : null,
        approvedByUserId: userId || null,
      },
      include: {
        canonicalCompany: {
          select: {
            id: true,
            name: true,
            companyType: true,
            website: true,
          }
        }
      }
    })

    // Determine activity type based on new status
    let activityType: ActivityType
    let activityDescription: string

    switch (status) {
      case ApprovalStatus.APPROVED:
        activityType = ActivityType.APPROVAL_GRANTED
        activityDescription = `Buyer approved for outreach`
        break
      case ApprovalStatus.DENIED:
        activityType = ActivityType.APPROVAL_DENIED
        activityDescription = `Buyer denied: ${note}`
        break
      case ApprovalStatus.HOLD:
        activityType = ActivityType.NOTE_ADDED
        activityDescription = `Buyer placed on hold${note ? `: ${note}` : ''}`
        break
      default:
        activityType = ActivityType.NOTE_ADDED
        activityDescription = `Approval status reset to pending${note ? `: ${note}` : ''}`
    }

    // Log activity
    await prisma.dealActivity2.create({
      data: {
        dealId,
        dealBuyerId: buyerId,
        activityType,
        subject: `Approval status changed to ${status}`,
        description: activityDescription,
        metadata: {
          previousStatus,
          newStatus: status,
          note,
        },
        performedByUserId: userId || 'system',
      }
    })

    return NextResponse.json({
      buyer: updatedBuyer,
      previousStatus,
      newStatus: status,
    })
  } catch (error) {
    console.error('Error updating approval status:', error)
    return NextResponse.json(
      { error: 'Failed to update approval status' },
      { status: 500 }
    )
  }
}
