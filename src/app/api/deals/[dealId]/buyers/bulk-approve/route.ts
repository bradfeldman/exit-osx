import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { ApprovalStatus, ActivityType } from '@prisma/client'

type RouteParams = Promise<{ dealId: string }>

/**
 * POST /api/deals/[dealId]/buyers/bulk-approve
 * Bulk change approval status for multiple buyers.
 *
 * Body:
 * - buyerIds: string[] (array of buyer IDs to update)
 * - status: 'APPROVED' | 'DENIED' | 'HOLD' | 'PENDING'
 * - note?: string (required for DENIED)
 * - userId: string (who is making the change)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  // SECURITY FIX (PROD-060): Was completely unauthenticated — anyone could bulk-approve deal buyers.
  // Also was accepting userId from the request body which is trivially spoofable.
  const authResult = await checkPermission('COMPANY_VIEW')
  if (isAuthError(authResult)) return authResult.error
  const authenticatedUserId = authResult.auth.user.id

  try {
    const { dealId } = await params
    const body = await request.json()
    // SECURITY FIX (PROD-060): Ignore userId from body — use authenticated user ID instead.
    const { buyerIds, status, note } = body
    const userId = authenticatedUserId

    // Validate inputs
    if (!Array.isArray(buyerIds) || buyerIds.length === 0) {
      return NextResponse.json(
        { error: 'buyerIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!status || !Object.values(ApprovalStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be APPROVED, DENIED, HOLD, or PENDING' },
        { status: 400 }
      )
    }

    // Require reason for denial
    if (status === ApprovalStatus.DENIED && !note) {
      return NextResponse.json(
        { error: 'A reason is required when denying buyers' },
        { status: 400 }
      )
    }

    // Verify all buyers belong to this deal
    const buyers = await prisma.dealBuyer.findMany({
      where: {
        id: { in: buyerIds },
        dealId: dealId,
      },
      select: {
        id: true,
        approvalStatus: true,
        canonicalCompany: {
          select: { name: true }
        }
      }
    })

    if (buyers.length !== buyerIds.length) {
      return NextResponse.json(
        { error: 'One or more buyers not found or do not belong to this deal' },
        { status: 400 }
      )
    }

    // Determine activity type and description
    let activityType: ActivityType
    let activityDescription: string

    switch (status) {
      case ApprovalStatus.APPROVED:
        activityType = ActivityType.APPROVAL_GRANTED
        activityDescription = 'Buyer approved for outreach (bulk action)'
        break
      case ApprovalStatus.DENIED:
        activityType = ActivityType.APPROVAL_DENIED
        activityDescription = `Buyer denied (bulk action): ${note}`
        break
      case ApprovalStatus.HOLD:
        activityType = ActivityType.NOTE_ADDED
        activityDescription = `Buyer placed on hold (bulk action)${note ? `: ${note}` : ''}`
        break
      default:
        activityType = ActivityType.NOTE_ADDED
        activityDescription = `Approval status reset to pending (bulk action)${note ? `: ${note}` : ''}`
    }

    // Use transaction to update all buyers and create activities
    const results = await prisma.$transaction(async (tx) => {
      // Update all buyers
      await tx.dealBuyer.updateMany({
        where: {
          id: { in: buyerIds },
          dealId: dealId,
        },
        data: {
          approvalStatus: status as ApprovalStatus,
          approvalNote: note || null,
          approvedAt: status === ApprovalStatus.APPROVED ? new Date() : null,
          approvedByUserId: userId || null,
        }
      })

      // Create activity records for each buyer
      const activityPromises = buyers.map((buyer) =>
        tx.dealActivity2.create({
          data: {
            dealId,
            dealBuyerId: buyer.id,
            activityType,
            subject: `Bulk approval status changed to ${status}`,
            description: activityDescription,
            metadata: {
              previousStatus: buyer.approvalStatus,
              newStatus: status,
              note,
              bulkAction: true,
            },
            performedByUserId: userId || 'system',
          }
        })
      )

      await Promise.all(activityPromises)

      // Fetch updated buyers
      return tx.dealBuyer.findMany({
        where: {
          id: { in: buyerIds },
        },
        include: {
          canonicalCompany: {
            select: {
              id: true,
              name: true,
              companyType: true,
            }
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      updatedCount: results.length,
      buyers: results,
      status,
    })
  } catch (error) {
    console.error('Error in bulk approval:', error)
    return NextResponse.json(
      { error: 'Failed to update approval status' },
      { status: 500 }
    )
  }
}
