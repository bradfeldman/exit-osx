import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateNextLevelTasks } from '@/lib/playbook/generate-tasks'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { improveSnapshotForOnboardingTask } from '@/lib/valuation/improve-snapshot-for-task'
import { checkAssessmentTriggers } from '@/lib/assessment/assessment-triggers'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { onTaskStatusChange } from '@/lib/tasks/action-plan'
import { BRI_CATEGORY_LABELS, type BRICategory } from '@/lib/constants/bri-categories'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await request.json()
    const { completionNotes, evidenceDocumentIds } = body as {
      completionNotes?: string
      evidenceDocumentIds?: string[]
    }

    // Fetch task
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, organizationId: true } },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const result = await checkPermission('TASK_UPDATE', existingTask.companyId)
    if (isAuthError(result)) return result.error

    // Snapshot the current normalized value at completion time
    const completedValue = existingTask.normalizedValue

    // Update the task to COMPLETED
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completionNotes: completionNotes || null,
        completedValue,
        blockedAt: null,
        blockedReason: null,
      },
    })

    // Link evidence documents if provided
    if (evidenceDocumentIds && evidenceDocumentIds.length > 0) {
      await prisma.dataRoomDocument.updateMany({
        where: {
          id: { in: evidenceDocumentIds },
          companyId: existingTask.companyId,
        },
        data: { linkedTaskId: id },
      })
    }

    // Handle BRI update based on task type
    let briImpact: { previousScore: number; newScore: number; categoryChanged: string } | null = null

    if (existingTask.linkedQuestionId) {
      // Assessment-linked task - use Answer Upgrade System
      if (existingTask.upgradesToOptionId) {
        const response = await prisma.assessmentResponse.findFirst({
          where: {
            questionId: existingTask.linkedQuestionId,
            assessment: {
              companyId: existingTask.companyId,
              completedAt: { not: null },
            },
          },
          orderBy: { assessment: { completedAt: 'desc' } },
        })

        if (response) {
          await prisma.assessmentResponse.update({
            where: { id: response.id },
            data: { effectiveOptionId: existingTask.upgradesToOptionId },
          })
        }
      }

      const preSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId: existingTask.companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true },
      })

      await recalculateSnapshotForCompany(
        existingTask.companyId,
        `Task completed: ${existingTask.title}`
      )

      const postSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId: existingTask.companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true },
      })

      if (preSnapshot && postSnapshot) {
        briImpact = {
          previousScore: Number(preSnapshot.briScore),
          newScore: Number(postSnapshot.briScore),
          categoryChanged: existingTask.briCategory,
        }
      }

      await generateNextLevelTasks(existingTask.companyId, existingTask.linkedQuestionId)
    } else {
      // Onboarding task
      const preSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId: existingTask.companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true },
      })

      await improveSnapshotForOnboardingTask({
        id: existingTask.id,
        companyId: existingTask.companyId,
        briCategory: existingTask.briCategory,
        rawImpact: existingTask.rawImpact,
        title: existingTask.title,
      })

      const postSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId: existingTask.companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true },
      })

      if (preSnapshot && postSnapshot) {
        briImpact = {
          previousScore: Number(preSnapshot.briScore),
          newScore: Number(postSnapshot.briScore),
          categoryChanged: existingTask.briCategory,
        }
      }
    }

    await checkAssessmentTriggers(existingTask.companyId)
    await onTaskStatusChange(id, 'COMPLETED', true)

    // Get next task
    const nextTask = await prisma.task.findFirst({
      where: {
        companyId: existingTask.companyId,
        status: 'PENDING',
        inActionPlan: true,
      },
      orderBy: [{ priorityRank: 'asc' }, { rawImpact: 'desc' }],
      select: {
        id: true,
        title: true,
        normalizedValue: true,
        briCategory: true,
      },
    })

    // Monthly stats
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const monthlyCompleted = await prisma.task.findMany({
      where: {
        companyId: existingTask.companyId,
        status: 'COMPLETED',
        completedAt: { gte: monthStart },
      },
      select: { completedValue: true, normalizedValue: true },
    })

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        completedValue: Number(completedValue),
        categoryLabel: BRI_CATEGORY_LABELS[task.briCategory as BRICategory] ?? task.briCategory,
        briImpact,
      },
      nextTask: nextTask
        ? {
            id: nextTask.id,
            title: nextTask.title,
            normalizedValue: Number(nextTask.normalizedValue),
            briCategory: nextTask.briCategory,
            categoryLabel: BRI_CATEGORY_LABELS[nextTask.briCategory as BRICategory] ?? nextTask.briCategory,
          }
        : null,
      followUpTaskGenerated: false,
      monthlyTotal: {
        completedCount: monthlyCompleted.length,
        totalValueRecovered: monthlyCompleted.reduce(
          (sum, t) => sum + Number(t.completedValue ?? t.normalizedValue ?? 0),
          0
        ),
      },
    })
  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    )
  }
}
