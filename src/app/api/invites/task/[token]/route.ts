import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET - Get invite details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const invite = await prisma.taskInvite.findUnique({
      where: { token },
      include: {
        task: {
          include: {
            company: true,
          },
        },
        invitedBy: {
          select: {
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
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })
    }

    if (invite.declinedAt) {
      return NextResponse.json({ error: 'Invite was declined' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Check if the invited email has an existing account
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email.toLowerCase() },
      select: { id: true },
    })

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        isPrimary: invite.isPrimary,
        expiresAt: invite.expiresAt,
        hasExistingAccount: !!existingUser,
        task: {
          id: invite.task.id,
          title: invite.task.title,
          description: invite.task.description,
        },
        company: {
          id: invite.task.company.id,
          name: invite.task.company.name,
        },
        invitedBy: invite.invitedBy,
      },
    })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invite' },
      { status: 500 }
    )
  }
}

// POST - Accept the invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { token } = await params

  if (!user) {
    return NextResponse.json({ error: 'Please log in to accept this invite' }, { status: 401 })
  }

  try {
    // Get invite
    const invite = await prisma.taskInvite.findUnique({
      where: { token },
      include: {
        task: {
          include: {
            company: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })
    }

    if (invite.declinedAt) {
      return NextResponse.json({ error: 'Invite was declined' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
    }

    // Get or create user in our system
    let dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!dbUser) {
      // Create user if they don't exist
      dbUser = await prisma.user.create({
        data: {
          authId: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url,
        },
      })
    }

    // Add user to the organization if not already a member
    const existingMembership = await prisma.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invite.task.company.organizationId,
          userId: dbUser.id,
        },
      },
    })

    if (!existingMembership) {
      await prisma.organizationUser.create({
        data: {
          organizationId: invite.task.company.organizationId,
          userId: dbUser.id,
          role: 'MEMBER',
        },
      })
    }

    // Assign user to the task
    if (invite.isPrimary) {
      await prisma.task.update({
        where: { id: invite.taskId },
        data: { primaryAssigneeId: dbUser.id },
      })
    }

    // Also add to task assignments
    await prisma.taskAssignment.upsert({
      where: {
        taskId_userId: {
          taskId: invite.taskId,
          userId: dbUser.id,
        },
      },
      create: {
        taskId: invite.taskId,
        userId: dbUser.id,
      },
      update: {},
    })

    // Mark invite as accepted
    await prisma.taskInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      taskId: invite.taskId,
      companyId: invite.task.companyId,
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}

// DELETE - Decline the invite
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {
    const invite = await prisma.taskInvite.findUnique({
      where: { token },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invite already accepted' }, { status: 400 })
    }

    await prisma.taskInvite.update({
      where: { id: invite.id },
      data: { declinedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error declining invite:', error)
    return NextResponse.json(
      { error: 'Failed to decline invite' },
      { status: 500 }
    )
  }
}
