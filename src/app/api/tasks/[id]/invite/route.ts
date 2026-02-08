import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// POST - Invite a user to a task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id: taskId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { email, isPrimary = true } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { authId: user.id },
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify user has access to the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id } },
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if user is already a team member
    const existingTeamMember = await prisma.organizationUser.findFirst({
      where: {
        organizationId: task.company.organizationId,
        user: { email: email.toLowerCase() },
      },
      include: { user: true },
    })

    if (existingTeamMember) {
      // User is already a team member - just assign them
      if (isPrimary) {
        await prisma.task.update({
          where: { id: taskId },
          data: { primaryAssigneeId: existingTeamMember.userId },
        })
      } else {
        await prisma.taskAssignment.upsert({
          where: {
            taskId_userId: {
              taskId,
              userId: existingTeamMember.userId,
            },
          },
          create: {
            taskId,
            userId: existingTeamMember.userId,
          },
          update: {},
        })
      }

      return NextResponse.json({
        success: true,
        message: 'User is already a team member and has been assigned',
        assigned: true,
      })
    }

    // Check if invite already exists
    const existingInvite = await prisma.taskInvite.findUnique({
      where: {
        taskId_email: {
          taskId,
          email: email.toLowerCase(),
        },
      },
    })

    // If there's an existing active invite, allow re-send (upsert below will update it)

    // Create the invite
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

    const invite = await prisma.taskInvite.upsert({
      where: {
        taskId_email: {
          taskId,
          email: email.toLowerCase(),
        },
      },
      create: {
        taskId,
        email: email.toLowerCase(),
        invitedById: currentUser.id,
        isPrimary,
        expiresAt,
      },
      update: {
        invitedById: currentUser.id,
        isPrimary,
        expiresAt,
        acceptedAt: null,
        declinedAt: null,
      },
    })

    // Check if user already has an Exit OSx account
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Send email notification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/task/${invite.token}`

    if (resend) {
      try {
        if (existingUser) {
          // Existing user - notify them of the invite
          await resend.emails.send({
            from: 'Exit OSx <noreply@exitosx.com>',
            to: email,
            subject: `You've been invited to a task: ${task.title}`,
            html: `
              <h2>You've been invited to a task</h2>
              <p><strong>${currentUser.name || currentUser.email}</strong> has invited you to work on a task for <strong>${task.company.name}</strong>.</p>
              <h3>${task.title}</h3>
              <p>${task.description}</p>
              <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #B87333; color: white; text-decoration: none; border-radius: 6px;">Accept Invite</a></p>
              <p>This invite expires in 7 days.</p>
            `,
          })
        } else {
          // New user - invite them to join
          await resend.emails.send({
            from: 'Exit OSx <noreply@exitosx.com>',
            to: email,
            subject: `You've been invited to join Exit OSx`,
            html: `
              <h2>You've been invited to Exit OSx</h2>
              <p><strong>${currentUser.name || currentUser.email}</strong> has invited you to work on a task for <strong>${task.company.name}</strong>.</p>
              <h3>${task.title}</h3>
              <p>${task.description}</p>
              <p>Exit OSx helps business owners prepare for a successful exit by improving their buyer readiness.</p>
              <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #B87333; color: white; text-decoration: none; border-radius: 6px;">Accept Invite & Create Account</a></p>
              <p>This invite expires in 7 days.</p>
            `,
          })
        }
      } catch (emailError) {
        console.error('Error sending invite email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        isPrimary: invite.isPrimary,
        expiresAt: invite.expiresAt,
      },
      isExistingUser: !!existingUser,
    })
  } catch (error) {
    console.error('Error creating task invite:', error)
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
  const { id: taskId } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Support both inviteId (query param) and email (body) for cancellation
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('inviteId')
    let email: string | null = null

    try {
      const body = await request.json()
      email = body.email?.toLowerCase() || null
    } catch {
      // No body, that's fine
    }

    if (!inviteId && !email) {
      return NextResponse.json({ error: 'Invite ID or email is required' }, { status: 400 })
    }

    // Verify user has access to the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id } },
                },
              },
            },
          },
        },
      },
    })

    if (!task || task.company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (inviteId) {
      await prisma.taskInvite.delete({
        where: { id: inviteId, taskId },
      })
    } else if (email) {
      await prisma.taskInvite.delete({
        where: { taskId_email: { taskId, email } },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task invite:', error)
    return NextResponse.json(
      { error: 'Failed to delete invite' },
      { status: 500 }
    )
  }
}
