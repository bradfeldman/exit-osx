import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ApprovalStatus, ActivityType } from '@prisma/client'
import { validateSellerAccess } from '@/lib/contact-system/seller-projection'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

type RouteParams = Promise<{ dealId: string }>

const sellerApproveSchema = z.object({
  buyerId: z.string().uuid(),
  action: z.enum(['approve', 'deny', 'hold']),
  reason: z.string().max(5000).optional(),
}).refine(
  (data) => data.action !== 'deny' || data.reason,
  { message: 'Reason is required when denying', path: ['reason'] }
)

/**
 * POST /api/seller/[dealId]/approve
 * Seller approval action for buyers
 *
 * Body:
 * - buyerId: string
 * - action: 'approve' | 'deny' | 'hold'
 * - reason?: string (required for deny)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { dealId } = await params
    const validation = await validateRequestBody(request, sellerApproveSchema)
    if (!validation.success) return validation.error
    const { buyerId, action, reason } = validation.data

    // SECURITY FIX (PROD-060): Was reading user ID from spoofable x-user-id header.
    // Now uses proper Supabase auth to get the authenticated user.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to access this resource' },
        { status: 401 }
      )
    }
    const dbUser = await prisma.user.findUnique({ where: { authId: user.id } })
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found', message: 'Your user account could not be found' },
        { status: 404 }
      )
    }
    const userId = dbUser.id

    // Validate seller access
    const access = await validateSellerAccess(userId, dealId)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: access.error || 'Access denied' },
        { status: 403 }
      )
    }

    // Verify buyer belongs to this deal
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      include: {
        canonicalCompany: {
          select: { name: true }
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

    // Map action to status
    let newStatus: ApprovalStatus
    let activityType: ActivityType

    switch (action) {
      case 'approve':
        newStatus = ApprovalStatus.APPROVED
        activityType = ActivityType.APPROVAL_GRANTED
        break
      case 'deny':
        newStatus = ApprovalStatus.DENIED
        activityType = ActivityType.APPROVAL_DENIED
        break
      case 'hold':
        newStatus = ApprovalStatus.HOLD
        activityType = ActivityType.NOTE_ADDED
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    const previousStatus = buyer.approvalStatus

    // Update buyer
    await prisma.dealBuyer.update({
      where: { id: buyerId },
      data: {
        approvalStatus: newStatus,
        approvalNote: reason || null,
        approvedAt: action === 'approve' ? new Date() : null,
        approvedByUserId: userId,
      }
    })

    // Log activity
    await prisma.dealActivity2.create({
      data: {
        dealId,
        dealBuyerId: buyerId,
        activityType,
        subject: `Seller ${action}d buyer: ${buyer.canonicalCompany.name}`,
        description: reason,
        metadata: {
          previousStatus,
          newStatus,
          sellerAction: true,
        },
        performedByUserId: userId,
      }
    })

    return NextResponse.json({
      success: true,
      buyerId,
      previousStatus,
      newStatus,
    })
  } catch (error) {
    console.error('Error processing seller approval:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}
