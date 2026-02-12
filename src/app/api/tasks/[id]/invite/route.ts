import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendTaskDelegationEmail } from '@/lib/email/send-task-delegation-email'

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
            workspace: {
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

    if (task.company.workspace.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if user is already a team member
    const existingTeamMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: task.company.workspaceId,
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
    const _existingInvite = await prisma.taskInvite.findUnique({
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

    // Send delegation email using the proper template
    // For users who don't exist yet, we use the currentUser's ID for logging/tracking
    // and skip preference checks since they have no preferences yet
    try {
      const normalizedValue = Number(task.normalizedValue)

      await sendTaskDelegationEmail({
        userId: existingUser?.id || currentUser.id, // Use inviter's ID for logging if invitee doesn't exist
        email: email.toLowerCase(),
        name: existingUser?.name ?? undefined,
        companyId: task.companyId,
        companyName: task.company.name,
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description ?? undefined,
        taskCategory: task.briCategory,
        estimatedValue: normalizedValue > 0 ? normalizedValue : undefined,
        delegatedBy: {
          name: currentUser.name || currentUser.email,
          email: currentUser.email,
        },
        dueDate: task.dueDate,
        inviteToken: invite.token, // Link to invite acceptance page
      })
    } catch (emailError) {
      console.error('Error sending task delegation email:', emailError)
      // Don't fail the request if email fails - invite is still created
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
            workspace: {
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

    if (!task || task.company.workspace.users.length === 0) {
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
