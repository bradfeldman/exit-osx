import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateNextLevelTasks, renormalizeTaskValues } from '@/lib/playbook/generate-tasks'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { improveSnapshotForOnboardingTask } from '@/lib/valuation/improve-snapshot-for-task'
import { checkAssessmentTriggers } from '@/lib/assessment/assessment-triggers'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // First fetch the task to get its companyId for permission check
    const taskForAuth = await prisma.task.findUnique({
      where: { id },
      select: { companyId: true },
    })

    if (!taskForAuth) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check permission with company context
    const result = await checkPermission('TASK_VIEW', taskForAuth.companyId)
    if (isAuthError(result)) return result.error

    // Now fetch full task data
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            workspaceId: true,
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
        subSteps: {
          select: { id: true, title: true, completed: true, completedAt: true, order: true, subTaskType: true, responseText: true, responseJson: true, linkedDocId: true, integrationKey: true, placeholder: true, acceptedTypes: true, questionOptions: true },
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error fetching task:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

const patchTaskSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'DEFERRED', 'CANCELLED', 'NOT_APPLICABLE']).optional(),
  deferredUntil: z.string().optional().nullable(),
  deferralReason: z.string().max(500).optional().nullable(),
  blockedReason: z.string().max(500).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  primaryAssigneeId: z.string().uuid().optional().nullable(),
  assigneeIds: z.array(z.string().uuid()).max(50).optional(),
  completionNotes: z.string().max(5000).optional().nullable(),
  subStepId: z.string().uuid().optional(),
  subStepCompleted: z.boolean().optional(),
  subStepResponseText: z.string().max(10000).optional().nullable(),
  subStepResponseJson: z.unknown().optional().nullable(),
  subStepLinkedDocId: z.string().optional().nullable(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const validation = await validateRequestBody(request, patchTaskSchema)
    if (!validation.success) return validation.error
    const { status, deferredUntil, deferralReason, blockedReason, dueDate, primaryAssigneeId, assigneeIds, completionNotes, subStepId, subStepCompleted, subStepResponseText, subStepResponseJson, subStepLinkedDocId } = validation.data

    // Fetch task to get companyId for permission check
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            workspaceId: true,
          },
        },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check TASK_UPDATE permission - requires at least MEMBER role
    const result = await checkPermission('TASK_UPDATE', existingTask.companyId)
    if (isAuthError(result)) return result.error

    // If assigning tasks, check TASK_ASSIGN permission (requires TEAM_LEADER+)
    if (primaryAssigneeId !== undefined || assigneeIds !== undefined) {
      const assignResult = await checkPermission('TASK_ASSIGN', existingTask.companyId)
      if (isAuthError(assignResult)) return assignResult.error
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (status) {
      updateData.status = status
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date()
        updateData.completedValue = existingTask.normalizedValue
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
      } else if (status === 'IN_PROGRESS') {
        // Set startedAt when first moving to IN_PROGRESS
        if (existingTask.status !== 'IN_PROGRESS') {
          updateData.startedAt = new Date()
        }
        // Clear blocked state when resuming work
        updateData.blockedAt = null
        updateData.blockedReason = null
      } else if (status === 'PENDING') {
        // Clear blocked state when resuming work
        updateData.blockedAt = null
        updateData.blockedReason = null
      } else if (status === 'NOT_APPLICABLE') {
        // Remove from action plan when marked as not applicable
        updateData.inActionPlan = false
      }
    }

    // Handle sub-step update (toggle, text response, file link, Q&A)
    if (subStepId !== undefined) {
      const subStepUpdate: Record<string, unknown> = {}
      if (subStepCompleted !== undefined) {
        subStepUpdate.completed = subStepCompleted
        subStepUpdate.completedAt = subStepCompleted ? new Date() : null
      }
      if (subStepResponseText !== undefined) {
        subStepUpdate.responseText = subStepResponseText
      }
      if (subStepResponseJson !== undefined) {
        subStepUpdate.responseJson = subStepResponseJson
      }
      if (subStepLinkedDocId !== undefined) {
        subStepUpdate.linkedDocId = subStepLinkedDocId
      }
      if (Object.keys(subStepUpdate).length > 0) {
        await prisma.taskSubStep.update({
          where: { id: subStepId },
          data: subStepUpdate,
        })
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
        const isTeamMember = await prisma.workspaceMember.findFirst({
          where: {
            workspaceId: existingTask.company.workspaceId,
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
        const teamMembers = await prisma.workspaceMember.findMany({
          where: {
            workspaceId: existingTask.company.workspaceId,
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
        subSteps: {
          select: { id: true, title: true, completed: true, completedAt: true, order: true, subTaskType: true, responseText: true, responseJson: true, linkedDocId: true, integrationKey: true, placeholder: true, acceptedTypes: true, questionOptions: true },
          orderBy: { order: 'asc' },
        },
      },
    })

    // Handle task completion - two paths based on whether task is linked to assessment
    if (status === 'COMPLETED') {
      if (existingTask.linkedQuestionId) {
        // PATH A: Assessment-linked task - use Answer Upgrade System
        // 1. Upgrade the effective answer if task has upgrade mapping
        if (existingTask.upgradesToOptionId) {
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
        const nextLevel = await generateNextLevelTasks(
          existingTask.companyId,
          existingTask.linkedQuestionId
        )
        if (nextLevel.created > 0) {
          console.log(`[TASK_ENGINE] Generated ${nextLevel.created} next-level task(s)`)
        }
      } else {
        // PATH B: Onboarding task (no linkedQuestionId) - directly improve BRI score
        // This handles tasks from the quick scan that aren't tied to assessment questions
        const result = await improveSnapshotForOnboardingTask({
          id: existingTask.id,
          companyId: existingTask.companyId,
          briCategory: existingTask.briCategory,
          rawImpact: existingTask.rawImpact,
          title: existingTask.title,
        })

        if (result.success) {
          console.log(`[ONBOARDING_TASK] Snapshot updated: BRI ${result.previousBriScore?.toFixed(3)} → ${result.newBriScore?.toFixed(3)}`)
        } else {
          console.error(`[ONBOARDING_TASK] Failed to improve snapshot: ${result.error}`)
        }
      }

      // Check if assessment trigger threshold is reached (for both paths)
      const triggerResult = await checkAssessmentTriggers(existingTask.companyId)
      if (triggerResult.shouldCreate && triggerResult.reason === 'ACTION_PLAN_THRESHOLD') {
        console.log(`[ASSESSMENT_TRIGGER] Threshold reached for company ${existingTask.companyId}: ${triggerResult.message}`)
        // Note: Assessment is not auto-created here, user is notified via alerts
        // and the badge appears on the Risk nav item
      }
    }

    // Renormalize display values for cancelled or not applicable tasks
    if (status === 'CANCELLED' || status === 'NOT_APPLICABLE') {
      await renormalizeTaskValues(existingTask.companyId)
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error('Error updating task:', error instanceof Error ? error.message : String(error))
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
  const { id } = await params

  try {
    // Fetch task to get companyId for permission check
    const existingTask = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        companyId: true,
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // DELETE requires ADMIN or higher (ORG_MANAGE_MEMBERS permission)
    const result = await checkPermission('ORG_MANAGE_MEMBERS', existingTask.companyId)
    if (isAuthError(result)) return result.error

    const companyId = existingTask.companyId

    await prisma.task.delete({ where: { id } })

    // Renormalize remaining task values after deletion
    await renormalizeTaskValues(companyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}
