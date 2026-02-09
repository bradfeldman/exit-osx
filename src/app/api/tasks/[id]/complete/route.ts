import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generateNextLevelTasks } from '@/lib/playbook/generate-tasks'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { improveSnapshotForOnboardingTask } from '@/lib/valuation/improve-snapshot-for-task'
import { checkAssessmentTriggers } from '@/lib/assessment/assessment-triggers'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { onTaskStatusChange } from '@/lib/tasks/action-plan'
import { BRI_CATEGORY_LABELS, type BRICategory } from '@/lib/constants/bri-categories'
import { createLedgerEntryForTaskCompletion } from '@/lib/value-ledger/create-entry'
import { createSignal } from '@/lib/signals/create-signal'
import { triggerDossierUpdate } from '@/lib/dossier/build-dossier'
import type { BriCategory } from '@prisma/client'
import type { TaskGeneratedData } from '@/lib/signals/types'

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${value.toLocaleString()}`
}

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
    let preSnapshot: { briScore: unknown; currentValue: unknown } | null = null
    let postSnapshot: { briScore: unknown; currentValue: unknown } | null = null

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

      preSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId: existingTask.companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true, currentValue: true },
      })

      await recalculateSnapshotForCompany(
        existingTask.companyId,
        `Task completed: ${existingTask.title}`
      )

      postSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId: existingTask.companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true, currentValue: true },
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
      preSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId: existingTask.companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true, currentValue: true },
      })

      await improveSnapshotForOnboardingTask({
        id: existingTask.id,
        companyId: existingTask.companyId,
        briCategory: existingTask.briCategory,
        rawImpact: existingTask.rawImpact,
        title: existingTask.title,
      })

      postSnapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId: existingTask.companyId },
        orderBy: { createdAt: 'desc' },
        select: { briScore: true, currentValue: true },
      })

      if (preSnapshot && postSnapshot) {
        briImpact = {
          previousScore: Number(preSnapshot.briScore),
          newScore: Number(postSnapshot.briScore),
          categoryChanged: existingTask.briCategory,
        }
      }
    }

    // Create Value Ledger entry (non-blocking)
    try {
      await createLedgerEntryForTaskCompletion({
        companyId: existingTask.companyId,
        taskId: id,
        taskTitle: existingTask.title,
        briCategory: existingTask.briCategory,
        completedValue: Number(completedValue),
        briImpact,
        valueBefore: preSnapshot ? Number(preSnapshot.currentValue) : null,
        valueAfter: postSnapshot ? Number(postSnapshot.currentValue) : null,
      })
    } catch (err) {
      console.error('[ValueLedger] Failed to create entry (non-blocking):', err)
    }

    // Create TASK_GENERATED signal (non-blocking)
    try {
      const signalData: TaskGeneratedData = {
        taskId: id,
        taskTitle: existingTask.title,
        previousStatus: 'PENDING',
        newStatus: 'COMPLETED',
        completedValue: Number(completedValue),
      }

      await createSignal({
        companyId: existingTask.companyId,
        channel: 'TASK_GENERATED',
        category: existingTask.briCategory as BriCategory,
        eventType: 'task_completed',
        severity: 'LOW',
        confidence: 'CONFIDENT',
        title: `Task completed: ${existingTask.title}`,
        description: briImpact
          ? `BRI improved from ${(briImpact.previousScore * 100).toFixed(1)} to ${(briImpact.newScore * 100).toFixed(1)}`
          : `Completed with ~${formatCurrency(Number(completedValue))} value recovered`,
        rawData: signalData as unknown as Record<string, unknown>,
        sourceType: 'task',
        sourceId: id,
        estimatedValueImpact: Number(completedValue),
        estimatedBriImpact: briImpact ? briImpact.newScore - briImpact.previousScore : null,
      })
    } catch (err) {
      console.error('[Signal] Failed to create task signal (non-blocking):', err)
    }

    // Update company dossier (non-blocking)
    triggerDossierUpdate(existingTask.companyId, 'task_completed', id)

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
