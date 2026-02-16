import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { isUserSubscribingOwner, checkCanInviteStaff, checkCanInviteOwner } from '@/lib/access'
import { requireEmailVerified } from '@/lib/auth/check-permission'
import { z } from 'zod'
import { validateRequestBody, emailSchema } from '@/lib/security/validation'

// GET - List pending invites for a company
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

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

    // Verify user is subscribing owner
    const isOwner = await isUserSubscribingOwner(dbUser.id, companyId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the subscribing owner can view invites' }, { status: 403 })
    }

    // Get pending invites
    const invites = await prisma.companyInvite.findMany({
      where: {
        companyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      invites: invites.map(invite => ({
        id: invite.id,
        email: invite.email,
        inviteType: invite.inviteType,
        ownershipPercent: invite.ownershipPercent?.toNumber(),
        inviter: invite.inviter,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching company invites:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}

const companyInviteCreateSchema = z.object({
  email: emailSchema,
  inviteType: z.enum(['GUEST_OWNER', 'STAFF']).default('STAFF'),
  ownershipPercent: z.coerce.number().finite().min(0).max(100).optional().nullable(),
})

// POST - Create a new invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, companyInviteCreateSchema)
  if (!validation.success) return validation.error

  const { email: normalizedEmail, inviteType: type, ownershipPercent } = validation.data

  try {

    // Get the current user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is subscribing owner
    const isOwner = await isUserSubscribingOwner(dbUser.id, companyId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the subscribing owner can invite members' }, { status: 403 })
    }

    // Require email verification before sending invites
    const verificationError = await requireEmailVerified(dbUser.id)
    if (verificationError) return verificationError

    // Check plan limits
    if (type === 'STAFF') {
      const check = await checkCanInviteStaff(companyId)
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason }, { status: 403 })
      }
    } else {
      const check = await checkCanInviteOwner(companyId)
      if (!check.allowed) {
        return NextResponse.json({ error: check.reason }, { status: 403 })
      }
    }

    // Check if invite already exists
    const existingInvite = await prisma.companyInvite.findUnique({
      where: {
        companyId_email: { companyId, email: normalizedEmail },
      },
    })

    if (existingInvite && !existingInvite.acceptedAt && existingInvite.expiresAt > new Date()) {
      return NextResponse.json({ error: 'An invite is already pending for this email' }, { status: 400 })
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      const existingOwnership = await prisma.companyOwnership.findUnique({
        where: {
          companyId_userId: { companyId, userId: existingUser.id },
        },
      })

      const existingStaff = await prisma.companyStaffAccess.findUnique({
        where: {
          companyId_userId: { companyId, userId: existingUser.id },
        },
      })

      if (existingOwnership || existingStaff) {
        return NextResponse.json({ error: 'This user is already a member of this company' }, { status: 400 })
      }
    }

    // Delete any existing expired invite
    if (existingInvite) {
      await prisma.companyInvite.delete({
        where: { id: existingInvite.id },
      })
    }

    // Create the invite (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.companyInvite.create({
      data: {
        companyId,
        email: normalizedEmail,
        inviteType: type,
        ownershipPercent: type === 'GUEST_OWNER' && ownershipPercent ? ownershipPercent : null,
        invitedById: dbUser.id,
        expiresAt,
      },
      include: {
        company: {
          select: { name: true },
        },
      },
    })

    // TODO: Send email invitation via Resend

    // SEC-075: Never expose raw invite token in API response
    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        inviteType: invite.inviteType,
        ownershipPercent: invite.ownershipPercent?.toNumber(),
        expiresAt: invite.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error creating company invite:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel an invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: companyId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('inviteId')

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 })
    }

    // Get the current user
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user is subscribing owner
    const isOwner = await isUserSubscribingOwner(dbUser.id, companyId)
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the subscribing owner can cancel invites' }, { status: 403 })
    }

    // Find and delete the invite
    const invite = await prisma.companyInvite.findFirst({
      where: {
        id: inviteId,
        companyId,
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    await prisma.companyInvite.delete({
      where: { id: inviteId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error canceling company invite:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    )
  }
}
