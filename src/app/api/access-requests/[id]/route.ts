import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { createAccessGrantedAlert, createAccessDeniedAlert } from '@/lib/alerts'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const patchSchema = z.object({
  action: z.enum(['approve', 'deny']),
})

// PATCH - Approve or deny an access request
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: requestId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, patchSchema)
  if (!validation.success) return validation.error
  const { action } = validation.data

  try {

    // Get the current user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the access request
    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: {
        company: {
          select: { name: true },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }

    // Verify the current user is the owner of this request
    if (accessRequest.ownerId !== dbUser.id) {
      return NextResponse.json({ error: 'Only the subscribing owner can respond to this request' }, { status: 403 })
    }

    // Check if request is still pending
    if (accessRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'This request has already been processed' }, { status: 400 })
    }

    // Check if request has expired
    if (accessRequest.expiresAt < new Date()) {
      await prisma.accessRequest.update({
        where: { id: requestId },
        data: { status: 'EXPIRED' },
      })
      return NextResponse.json({ error: 'This request has expired' }, { status: 400 })
    }

    if (action === 'approve') {
      // Grant the access
      const featureKey = accessRequest.featureKey
      const updateData: Record<string, boolean> = {}

      if (featureKey === 'pfs') {
        updateData.hasPFSAccess = true
      } else if (featureKey === 'retirement') {
        updateData.hasRetirementAccess = true
      } else if (featureKey === 'loans') {
        updateData.hasLoansAccess = true
      }

      await prisma.companyStaffAccess.update({
        where: {
          companyId_userId: {
            companyId: accessRequest.companyId,
            userId: accessRequest.requesterId,
          },
        },
        data: updateData,
      })

      // Update the request status
      await prisma.accessRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          respondedAt: new Date(),
        },
      })

      // Create alert for the requester
      await createAccessGrantedAlert(
        accessRequest.requesterId,
        featureKey,
        accessRequest.company.name
      )

      return NextResponse.json({
        success: true,
        status: 'APPROVED',
        message: `Access granted to ${accessRequest.requester.name || accessRequest.requester.email}`,
      })
    } else {
      // Deny the request
      await prisma.accessRequest.update({
        where: { id: requestId },
        data: {
          status: 'DENIED',
          respondedAt: new Date(),
        },
      })

      // Create alert for the requester
      await createAccessDeniedAlert(
        accessRequest.requesterId,
        accessRequest.featureKey,
        accessRequest.company.name
      )

      return NextResponse.json({
        success: true,
        status: 'DENIED',
        message: `Access denied for ${accessRequest.requester.name || accessRequest.requester.email}`,
      })
    }
  } catch (error) {
    console.error('Error processing access request:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to process access request' },
      { status: 500 }
    )
  }
}

// GET - Get a single access request
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: requestId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get the current user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const accessRequest = await prisma.accessRequest.findUnique({
      where: { id: requestId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    if (!accessRequest) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }

    // Only owner or requester can view
    if (accessRequest.ownerId !== dbUser.id && accessRequest.requesterId !== dbUser.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      request: {
        id: accessRequest.id,
        featureKey: accessRequest.featureKey,
        status: accessRequest.status,
        reason: accessRequest.reason,
        company: accessRequest.company,
        requester: accessRequest.requester,
        respondedAt: accessRequest.respondedAt?.toISOString(),
        expiresAt: accessRequest.expiresAt.toISOString(),
        createdAt: accessRequest.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching access request:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch access request' },
      { status: 500 }
    )
  }
}
