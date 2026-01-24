import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { UserRole } from '@prisma/client'

// GET - List pending invites
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params
  const result = await checkPermission('ORG_INVITE_USERS')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    // Verify user is member of this organization
    const membership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: auth.user.id,
        }
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const invites = await prisma.organizationInvite.findMany({
      where: {
        organizationId,
        acceptedAt: null,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    )
  }
}

// POST - Create invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params
  const result = await checkPermission('ORG_INVITE_USERS')
  if (isAuthError(result)) return result.error

  const { auth } = result

  try {
    const { email, role = 'MEMBER' } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Verify valid role
    const validRoles: UserRole[] = ['ADMIN', 'TEAM_LEADER', 'MEMBER', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organizations: {
          where: { organizationId }
        }
      }
    })

    if (existingUser && existingUser.organizations.length > 0) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      )
    }

    // Check if there's already a pending invite
    const existingInvite = await prisma.organizationInvite.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: email.toLowerCase(),
        }
      }
    })

    if (existingInvite && !existingInvite.acceptedAt) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 400 }
      )
    }

    // Create invite (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId,
        email: email.toLowerCase(),
        role,
        invitedBy: auth.user.id,
        expiresAt,
      },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true, email: true } }
      }
    })

    // TODO: Send email notification with invite link
    // For now, return the token so it can be shared manually
    const inviteUrl = `/invite/${invite.token}`

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
        inviteUrl,
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: organizationId } = await params
  const result = await checkPermission('ORG_INVITE_USERS')
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('inviteId')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'inviteId is required' },
        { status: 400 }
      )
    }

    // Verify invite belongs to this organization
    const invite = await prisma.organizationInvite.findFirst({
      where: {
        id: inviteId,
        organizationId,
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    await prisma.organizationInvite.delete({
      where: { id: inviteId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error canceling invite:', error)
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    )
  }
}
