import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { UserRole, FunctionalCategory } from '@prisma/client'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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
    const { email, role = 'MEMBER', functionalCategories = [] } = await request.json()

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

    // Validate functional categories if provided
    const validCategories: FunctionalCategory[] = [
      'OWNER', 'FINANCE', 'OPERATIONS', 'HR', 'LEGAL', 'SALES_MARKETING', 'IT', 'EXTERNAL'
    ]

    if (!Array.isArray(functionalCategories)) {
      return NextResponse.json(
        { error: 'functionalCategories must be an array' },
        { status: 400 }
      )
    }

    const invalidCategories = functionalCategories.filter((c: string) => !validCategories.includes(c as FunctionalCategory))
    if (invalidCategories.length > 0) {
      return NextResponse.json(
        { error: `Invalid categories: ${invalidCategories.join(', ')}` },
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
        functionalCategories: functionalCategories as FunctionalCategory[],
        invitedBy: auth.user.id,
        expiresAt,
      },
      include: {
        organization: { select: { name: true } },
        inviter: { select: { name: true, email: true } }
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.exitosx.com'
    const inviteUrl = `${baseUrl}/invite/${invite.token}`

    // Send email notification with invite link
    if (resend) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Exit OSx <noreply@exitosx.com>',
          to: invite.email,
          subject: `You've been invited to join ${invite.organization.name} on Exit OSx`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">You're Invited!</h2>
              <p>${invite.inviter.name || invite.inviter.email} has invited you to join <strong>${invite.organization.name}</strong> on Exit OSx.</p>
              <p>You've been assigned the role of <strong>${invite.role.replace('_', ' ').toLowerCase()}</strong>.</p>
              <div style="margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #c9a66b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">This invitation expires on ${new Date(invite.expiresAt).toLocaleDateString()}.</p>
              <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">Exit OSx - Business Exit Planning Platform</p>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Error sending invite email:', emailError)
        // Don't fail the invite creation if email fails
      }
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        functionalCategories: invite.functionalCategories,
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
