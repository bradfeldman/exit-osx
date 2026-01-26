import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { determineUserType } from '@/lib/access'

// GET - Get invite details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const invite = await prisma.companyInvite.findUnique({
      where: { token },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite has already been accepted' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        inviteType: invite.inviteType,
        ownershipPercent: invite.ownershipPercent?.toNumber(),
        company: invite.company,
        inviter: invite.inviter,
        expiresAt: invite.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching company invite:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invite' },
      { status: 500 }
    )
  }
}

// POST - Accept invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { token } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find the invite
    const invite = await prisma.companyInvite.findUnique({
      where: { token },
      include: {
        company: true,
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite has already been accepted' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Get or create the user
    let dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      // Create user if they don't exist
      const userType = determineUserType(user.email || '')
      dbUser = await prisma.user.create({
        data: {
          authId: user.id,
          email: user.email || '',
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          userType,
        },
      })
    }

    // Verify the invite is for this user's email
    if (dbUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite is for a different email address' },
        { status: 403 }
      )
    }

    // Check if user already has access
    const existingOwnership = await prisma.companyOwnership.findUnique({
      where: {
        companyId_userId: { companyId: invite.companyId, userId: dbUser.id },
      },
    })

    const existingStaff = await prisma.companyStaffAccess.findUnique({
      where: {
        companyId_userId: { companyId: invite.companyId, userId: dbUser.id },
      },
    })

    if (existingOwnership || existingStaff) {
      // Mark invite as accepted anyway
      await prisma.companyInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      })

      return NextResponse.json({
        success: true,
        message: 'You already have access to this company',
      })
    }

    // Create the appropriate access based on invite type
    if (invite.inviteType === 'GUEST_OWNER') {
      await prisma.companyOwnership.create({
        data: {
          companyId: invite.companyId,
          userId: dbUser.id,
          isSubscribingOwner: false,
          ownershipPercent: invite.ownershipPercent,
          invitedById: invite.invitedById,
          status: 'ACTIVE',
        },
      })
    } else {
      await prisma.companyStaffAccess.create({
        data: {
          companyId: invite.companyId,
          userId: dbUser.id,
          invitedById: invite.invitedById,
          status: 'ACTIVE',
        },
      })
    }

    // Mark invite as accepted
    await prisma.companyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      company: {
        id: invite.company.id,
        name: invite.company.name,
      },
      role: invite.inviteType === 'GUEST_OWNER' ? 'owner' : 'staff',
    })
  } catch (error) {
    console.error('Error accepting company invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}
