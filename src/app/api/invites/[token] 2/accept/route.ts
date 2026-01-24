import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// POST - Accept an invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { token } = await params

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Please log in to accept the invite' },
      { status: 401 }
    )
  }

  try {
    // Find the invite
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true } }
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: 'This invite has already been accepted' },
        { status: 400 }
      )
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 400 }
      )
    }

    // Get or create the user in our database
    let dbUser = await prisma.user.findUnique({
      where: { authId: user.id }
    })

    if (!dbUser) {
      // Create user if they don't exist yet
      dbUser = await prisma.user.create({
        data: {
          authId: user.id,
          email: user.email!,
          name: user.user_metadata?.name || null,
          avatarUrl: user.user_metadata?.avatar_url || null,
        }
      })
    }

    // Verify the invite email matches the logged-in user
    if (invite.email.toLowerCase() !== dbUser.email.toLowerCase()) {
      return NextResponse.json(
        {
          error: 'Email mismatch',
          message: `This invite was sent to ${invite.email}. Please log in with that email address.`
        },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const existingMembership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId: dbUser.id,
        }
      }
    })

    if (existingMembership) {
      // Mark invite as accepted and return
      await prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() }
      })

      return NextResponse.json({
        success: true,
        message: 'You are already a member of this organization',
        organization: invite.organization,
      })
    }

    // Add user to organization and mark invite as accepted
    await prisma.$transaction([
      prisma.organizationUser.create({
        data: {
          organizationId: invite.organizationId,
          userId: dbUser.id,
          role: invite.role,
        }
      }),
      prisma.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() }
      })
    ])

    return NextResponse.json({
      success: true,
      message: `You have joined ${invite.organization.name}`,
      organization: invite.organization,
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}

// GET - Get invite details (for display before accepting)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const invite = await prisma.organizationInvite.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true, email: true } }
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        organizationName: invite.organization.name,
        inviterName: invite.inviter.name || invite.inviter.email,
        expiresAt: invite.expiresAt,
        isExpired: new Date() > invite.expiresAt,
        isAccepted: !!invite.acceptedAt,
      }
    })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invite' },
      { status: 500 }
    )
  }
}
