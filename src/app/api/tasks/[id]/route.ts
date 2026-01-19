import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateNextLevelTasks, renormalizeTaskValues } from '@/lib/playbook/generate-tasks'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id },
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
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        primaryAssignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        invites: {
          where: {
            acceptedAt: null,
            declinedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            email: true,
            isPrimary: true,
            createdAt: true,
          },
        },
        proofDocuments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            documentName: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            fileSize: true,
            status: true,
            createdAt: true,
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

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error fetching task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { status, deferredUntil, deferralReason, blockedReason, dueDate, primaryAssigneeId, assigneeIds, completionNotes } = body

    // Verify user has access
    const existingTask = await prisma.task.findUnique({
      where: { id },
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

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
        // Clear blocked state when completed
        updateData.blockedAt = null
        updateData.blockedReason = null
        if (completionNotes) {
          updateData.completionNotes = completionNotes
        }
      } else if (status === 'DEFERRED') {
        updateData.deferredUntil = deferredUntil ? new Date(deferredUntil) : null
        updateData.deferralReason = deferralReason
      } else if (status === 'BLOCKED') {
        updateData.blockedAt = new Date()
        updateData.blockedReason = blockedReason || 'No reason provided'
      } else if (status === 'IN_PROGRESS' || status === 'PENDING') {
        // Clear blocked state when resuming work
        updateData.blockedAt = null
        updateData.blockedReason = null
      }
    }

    // Update completion notes even without status change
    if (completionNotes !== undefined && !status) {
      updateData.completionNotes = completionNotes
    }

    // Handle due date update
    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null
    }

    // Handle primary assignee update
    if (primaryAssigneeId !== undefined) {
      // Verify the user is part of the company's organization
      if (primaryAssigneeId) {
        const isTeamMember = await prisma.organizationUser.findFirst({
          where: {
            organizationId: existingTask.company.organizationId,
            userId: primaryAssigneeId,
          },
        })

        if (!isTeamMember) {
          return NextResponse.json(
            { error: 'Assignee must be a team member' },
            { status: 400 }
          )
        }
      }
      updateData.primaryAssigneeId = primaryAssigneeId
    }

    // Handle additional assignees update
    if (assigneeIds !== undefined) {
      // Verify all assignees are team members
      if (assigneeIds.length > 0) {
        const teamMembers = await prisma.organizationUser.findMany({
          where: {
            organizationId: existingTask.company.organizationId,
            userId: { in: assigneeIds },
          },
        })

        if (teamMembers.length !== assigneeIds.length) {
          return NextResponse.json(
            { error: 'All assignees must be team members' },
            { status: 400 }
          )
        }
      }

      // Delete existing assignments and create new ones
      await prisma.taskAssignment.deleteMany({
        where: { taskId: id },
      })

      if (assigneeIds.length > 0) {
        await prisma.taskAssignment.createMany({
          data: assigneeIds.map((userId: string) => ({
            taskId: id,
            userId,
          })),
        })
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        primaryAssignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        invites: {
          where: {
            acceptedAt: null,
            declinedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: {
            id: true,
            email: true,
            isPrimary: true,
            createdAt: true,
          },
        },
        proofDocuments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            documentName: true,
            fileName: true,
            fileUrl: true,
            mimeType: true,
            fileSize: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })

    // Handle Answer Upgrade System when task is completed
    if (status === 'COMPLETED') {
      // 1. Upgrade the effective answer if task has upgrade mapping
      if (existingTask.upgradesToOptionId && existingTask.linkedQuestionId) {
        // Find the latest assessment response for this question
        const response = await prisma.assessmentResponse.findFirst({
          where: {
            questionId: existingTask.linkedQuestionId,
            assessment: {
              companyId: existingTask.companyId,
              completedAt: { not: null }
            }
          },
          orderBy: { assessment: { completedAt: 'desc' } }
        })

        if (response) {
          // Upgrade the effective answer
          await prisma.assessmentResponse.update({
            where: { id: response.id },
            data: { effectiveOptionId: existingTask.upgradesToOptionId }
          })
          console.log(`[TASK_ENGINE] Upgraded effective answer for question ${existingTask.linkedQuestionId}`)
        }
      }

      // 2. Recalculate valuation with new effective answers
      await recalculateSnapshotForCompany(
        existingTask.companyId,
        `Task completed: ${existingTask.title}`
      )

      // 3. Generate next-level tasks if available
      if (existingTask.linkedQuestionId) {
        const nextLevel = await generateNextLevelTasks(
          existingTask.companyId,
          existingTask.linkedQuestionId
        )
        if (nextLevel.created > 0) {
          console.log(`[TASK_ENGINE] Generated ${nextLevel.created} next-level task(s)`)
        }
      }
    }

    // Renormalize display values for cancelled tasks
    if (status === 'CANCELLED') {
      await renormalizeTaskValues(existingTask.companyId)
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { id } = await params

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Verify user has access
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        company: {
          include: {
            organization: {
              include: {
                users: {
                  where: { user: { authId: user.id }, role: 'ADMIN' },
                },
              },
            },
          },
        },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (existingTask.company.organization.users.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const companyId = existingTask.companyId

    await prisma.task.delete({ where: { id } })

    // Renormalize remaining task values after deletion
    await renormalizeTaskValues(companyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
