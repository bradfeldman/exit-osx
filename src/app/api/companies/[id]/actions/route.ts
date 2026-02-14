import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { BRI_CATEGORY_LABELS, type BRICategory } from '@/lib/constants/bri-categories'
import { hasRichDescription, type RichTaskDescription } from '@/lib/playbook/rich-task-description'

function formatHoursToMinutes(hours: number | null): number | null {
  if (hours === null) return null
  return hours * 60
}

function formatSubSteps(
  subSteps: Array<{ id: string; title: string; completed: boolean; order: number }>
): { id: string; title: string; completed: boolean }[] {
  // Return sub-steps sorted by order
  return subSteps
    .sort((a, b) => a.order - b.order)
    .map(({ id, title, completed }) => ({ id, title, completed }))
}

function derivePrerequisiteHint(richDescription: unknown): string | null {
  if (!hasRichDescription(richDescription)) return null
  const rd = richDescription as RichTaskDescription
  if (rd.subTasks?.[0]?.items?.[0]) {
    const first = rd.subTasks[0].items[0]
    if (first.length <= 60) return `Needs: ${first}`
  }
  return null
}

function deriveOutputHint(richDescription: unknown): string | null {
  if (!hasRichDescription(richDescription)) return null
  const rd = richDescription as RichTaskDescription
  if (!rd.outputFormat?.formats) return null

  const formats = rd.outputFormat.formats.map(f => f.toLowerCase())
  if (formats.some(f => f.includes('upload') || f.includes('document'))) return 'Upload required'
  if (formats.some(f => f.includes('template'))) return 'Template available'
  return null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error
    const currentUserId = result.auth.user.id

    // Get current month boundaries
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Auto-resurface deferred tasks whose defer date has passed
    await prisma.task.updateMany({
      where: {
        companyId,
        status: 'DEFERRED',
        deferredUntil: { lte: now },
      },
      data: {
        status: 'PENDING',
        deferredUntil: null,
      },
    })

    // Fetch all relevant tasks in one query
    const allTasks = await prisma.task.findMany({
      where: {
        companyId,
        status: { notIn: ['CANCELLED', 'NOT_APPLICABLE'] },
      },
      include: {
        primaryAssignee: {
          select: { id: true, name: true, email: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        proofDocuments: {
          select: { id: true, documentName: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        subSteps: {
          select: { id: true, title: true, completed: true, order: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: [{ priorityRank: 'asc' }, { rawImpact: 'desc' }],
    })

    // Fetch pending invites for all tasks
    const taskIds = allTasks.map(t => t.id)
    const pendingInvites = await prisma.taskInvite.findMany({
      where: {
        taskId: { in: taskIds },
        acceptedAt: null,
        declinedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        taskId: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build a map of taskId → most recent pending invite
    const pendingInviteMap = new Map<string, { email: string; sentAt: string }>()
    for (const inv of pendingInvites) {
      if (!pendingInviteMap.has(inv.taskId)) {
        pendingInviteMap.set(inv.taskId, {
          email: inv.email,
          sentAt: inv.createdAt.toISOString(),
        })
      }
    }

    // Separate by status
    const activeTasks = allTasks.filter(t => t.status === 'IN_PROGRESS')
    const pendingTasks = allTasks.filter(t => t.status === 'PENDING' && t.inActionPlan)
    const deferredTasks = allTasks.filter(t => t.status === 'DEFERRED')
    const blockedTasks = allTasks.filter(t => t.status === 'BLOCKED')
    const completedThisMonthTasks = allTasks.filter(
      t => t.status === 'COMPLETED' && t.completedAt && t.completedAt >= monthStart
    )
    const waitingOnOthersTasks = allTasks.filter(
      t =>
        t.status === 'IN_PROGRESS' &&
        t.primaryAssigneeId &&
        t.primaryAssigneeId !== currentUserId
    )

    // Non-completed, non-cancelled count for total queue
    const totalQueueTasks = allTasks.filter(
      t => !['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'].includes(t.status)
    )

    // Build summary
    const valueRecoveredThisMonth = completedThisMonthTasks.reduce(
      (sum, t) => sum + Number(t.completedValue ?? t.normalizedValue ?? 0),
      0
    )

    const summary = {
      totalTasks: totalQueueTasks.length,
      activeTasks: activeTasks.length,
      deferredTasks: deferredTasks.length,
      completedThisMonth: completedThisMonthTasks.length,
      valueRecoveredThisMonth,
    }

    // Build active tasks (expanded)
    const activeTasksFormatted = activeTasks.map(task => {
      const subSteps = formatSubSteps(task.subSteps)
      const completedSteps = subSteps.filter(s => s.completed).length

      const daysInProgress = task.startedAt
        ? Math.floor((now.getTime() - task.startedAt.getTime()) / (1000 * 60 * 60 * 24))
        : task.updatedAt
          ? Math.floor((now.getTime() - task.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
          : null

      const rd = hasRichDescription(task.richDescription)
        ? (task.richDescription as RichTaskDescription)
        : null

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        briCategory: task.briCategory,
        categoryLabel: BRI_CATEGORY_LABELS[task.briCategory as BRICategory] ?? task.briCategory,
        normalizedValue: Number(task.normalizedValue),
        estimatedMinutes: formatHoursToMinutes(task.estimatedHours),
        effortLevel: task.effortLevel,
        status: task.status,
        startedAt: task.startedAt?.toISOString() ?? null,
        daysInProgress,
        priorityRank: task.priorityRank,
        buyerConsequence: task.buyerConsequence,
        buyerRisk: rd?.buyerRisk ?? null,
        subSteps,
        subStepProgress: {
          completed: completedSteps,
          total: subSteps.length,
        },
        successCriteria: rd?.successCriteria ?? null,
        outputFormat: rd?.outputFormat ?? null,
        assignee: task.primaryAssignee
          ? {
              id: task.primaryAssignee.id,
              name: task.primaryAssignee.name ?? task.primaryAssignee.email,
              email: task.primaryAssignee.email,
              role: task.assigneeRole,
            }
          : null,
        isAssignedToCurrentUser:
          !task.primaryAssigneeId || task.primaryAssigneeId === currentUserId,
        pendingInvite: pendingInviteMap.get(task.id) ?? null,
        proofDocuments: task.proofDocuments.map(d => ({
          id: d.id,
          name: d.documentName,
          uploadedAt: d.createdAt.toISOString(),
        })),
      }
    })

    // Build up next queue (all pending tasks) — full format so any can be focused
    const upNextFormatted = pendingTasks
      .filter(t => !waitingOnOthersTasks.some(w => w.id === t.id))
      .map(task => {
        const subSteps = formatSubSteps(task.subSteps)
        const completedSteps = subSteps.filter(s => s.completed).length
        const rd = hasRichDescription(task.richDescription)
          ? (task.richDescription as RichTaskDescription)
          : null

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          briCategory: task.briCategory,
          categoryLabel: BRI_CATEGORY_LABELS[task.briCategory as BRICategory] ?? task.briCategory,
          normalizedValue: Number(task.normalizedValue),
          estimatedMinutes: formatHoursToMinutes(task.estimatedHours),
          effortLevel: task.effortLevel,
          status: task.status,
          startedAt: null,
          daysInProgress: null,
          priorityRank: task.priorityRank,
          buyerConsequence: task.buyerConsequence,
          buyerRisk: rd?.buyerRisk ?? null,
          subSteps,
          subStepProgress: {
            completed: completedSteps,
            total: subSteps.length,
          },
          successCriteria: rd?.successCriteria ?? null,
          outputFormat: rd?.outputFormat ?? null,
          prerequisiteHint: derivePrerequisiteHint(task.richDescription),
          outputHint: deriveOutputHint(task.richDescription),
          assignee: task.primaryAssignee
            ? {
                id: task.primaryAssignee.id,
                name: task.primaryAssignee.name ?? task.primaryAssignee.email,
                email: task.primaryAssignee.email,
                role: task.assigneeRole,
              }
            : null,
          isAssignedToCurrentUser:
            !task.primaryAssigneeId || task.primaryAssigneeId === currentUserId,
          pendingInvite: pendingInviteMap.get(task.id) ?? null,
          proofDocuments: task.proofDocuments.map(d => ({
            id: d.id,
            name: d.documentName,
            uploadedAt: d.createdAt.toISOString(),
          })),
        }
      })

    // Build completed this month
    const completedFormatted = completedThisMonthTasks
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
      .map(task => ({
        id: task.id,
        title: task.title,
        completedValue: Number(task.completedValue ?? task.normalizedValue),
        completedAt: task.completedAt?.toISOString() ?? '',
        briCategory: task.briCategory,
        completionNotes: task.completionNotes,
        hasEvidence: task.proofDocuments.length > 0,
      }))

    // Build waiting on others
    const waitingFormatted = waitingOnOthersTasks.map(task => ({
      id: task.id,
      title: task.title,
      briCategory: task.briCategory,
      normalizedValue: Number(task.normalizedValue),
      assignee: task.primaryAssignee
        ? {
            name: task.primaryAssignee.name ?? task.primaryAssignee.email,
            email: task.primaryAssignee.email,
            role: task.assigneeRole,
          }
        : { name: 'Unknown', email: '', role: null },
      assignedAt: task.updatedAt.toISOString(),
      lastUpdated: task.updatedAt.toISOString(),
    }))

    // Build deferred tasks
    const deferredFormatted = deferredTasks.map(task => ({
      id: task.id,
      title: task.title,
      briCategory: task.briCategory,
      normalizedValue: Number(task.normalizedValue),
      deferredUntil: task.deferredUntil?.toISOString() ?? '',
      deferralReason: task.deferralReason,
    }))

    return NextResponse.json({
      summary,
      activeTasks: activeTasksFormatted,
      upNext: upNextFormatted,
      completedThisMonth: completedFormatted,
      waitingOnOthers: waitingFormatted,
      deferredTasks: deferredFormatted,
      blockedTasks: blockedTasks.length,
      hasMoreInQueue: false,
      totalQueueSize: pendingTasks.length + blockedTasks.length,
    })
  } catch (error) {
    console.error('Error fetching actions data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch actions data' },
      { status: 500 }
    )
  }
}
