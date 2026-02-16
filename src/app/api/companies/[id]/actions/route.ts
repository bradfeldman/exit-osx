import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { BRI_CATEGORY_LABELS, type BRICategory } from '@/lib/constants/bri-categories'
import { hasRichDescription, type RichTaskDescription, type CompanyContextData } from '@/lib/playbook/rich-task-description'
import { enrichTasksWithContext, triggerTaskReEnrichment } from '@/lib/tasks/enrich-task-context'
import { detectFinancialDrift } from '@/lib/tasks/detect-financial-drift'

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

function extractCompanyContext(richDescription: unknown): CompanyContextData | null {
  if (!richDescription || typeof richDescription !== 'object') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rd = richDescription as any
  if (!rd.companyContext || typeof rd.companyContext !== 'object') return null
  return rd.companyContext as CompanyContextData
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

    // Lazy retroactive enrichment: fill companyContext for pre-existing unenriched tasks
    const unenrichedCount = allTasks.filter(t => {
      if (['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'].includes(t.status)) return false
      const rd = t.richDescription as Record<string, unknown> | null
      return !rd?.companyContext
    }).length

    if (unenrichedCount > 0) {
      // Fire-and-forget — next page load will show enriched tasks
      enrichTasksWithContext(companyId).catch(err => {
        console.error('[ACTIONS] Lazy enrichment failed:', err instanceof Error ? err.message : String(err))
      })
    }

    // Fetch current financials for drift detection (one query)
    const latestPeriod = await prisma.financialPeriod.findFirst({
      where: { companyId },
      orderBy: { endDate: 'desc' },
      include: { incomeStatement: true },
    })
    const currentFinancials = latestPeriod?.incomeStatement ? {
      revenue: Number(latestPeriod.incomeStatement.grossRevenue),
      ebitda: Number(latestPeriod.incomeStatement.ebitda),
      ebitdaMarginPct: Number(latestPeriod.incomeStatement.ebitdaMarginPct) * 100,
    } : null

    // Build category → tasks map for cross-task context (zero additional DB queries)
    const tasksByCategory = new Map<string, Array<{ id: string; title: string; normalizedValue: number; status: string }>>()
    for (const t of allTasks) {
      if (['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'].includes(t.status)) continue
      const arr = tasksByCategory.get(t.briCategory) ?? []
      arr.push({ id: t.id, title: t.title, normalizedValue: Number(t.normalizedValue), status: t.status })
      tasksByCategory.set(t.briCategory, arr)
    }

    // Track whether any task has drift (to trigger re-enrichment)
    let anyDrift = false

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

      const companyContext = extractCompanyContext(task.richDescription)
      const drift = detectFinancialDrift(companyContext?.financialSnapshot, currentFinancials)
      if (drift.hasDrift) anyDrift = true

      const relatedTasks = (tasksByCategory.get(task.briCategory) ?? [])
        .filter(t => t.id !== task.id)
        .sort((a, b) => b.normalizedValue - a.normalizedValue)
        .slice(0, 3)
        .map(t => ({ id: t.id, title: t.title, value: t.normalizedValue, status: t.status }))

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
        companyContext,
        financialDrift: drift,
        relatedTasks,
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

        const companyContext = extractCompanyContext(task.richDescription)
        const drift = detectFinancialDrift(companyContext?.financialSnapshot, currentFinancials)
        if (drift.hasDrift) anyDrift = true

        const relatedTasks = (tasksByCategory.get(task.briCategory) ?? [])
          .filter(t => t.id !== task.id)
          .sort((a, b) => b.normalizedValue - a.normalizedValue)
          .slice(0, 3)
          .map(t => ({ id: t.id, title: t.title, value: t.normalizedValue, status: t.status }))

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
          companyContext,
          financialDrift: drift,
          relatedTasks,
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

    // If any task has financial drift, trigger re-enrichment (fire-and-forget)
    if (anyDrift) {
      triggerTaskReEnrichment(companyId)
    }

    // Check for most recent unread enrichment alert for this user
    const enrichmentAlert = await prisma.alert.findFirst({
      where: {
        recipientId: currentUserId,
        type: 'ACTION_PLAN_UPDATED',
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, message: true, createdAt: true },
    })

    // Fetch undismissed refinement events for banner
    let refinementEvents: Array<{
      id: string
      briCategory: string
      tasksAdded: number
      tasksUpdated: number
      tasksRemoved: number
      createdAt: Date
    }> = []
    try {
      refinementEvents = await prisma.taskRefinementEvent.findMany({
        where: {
          companyId,
          dismissedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          briCategory: true,
          tasksAdded: true,
          tasksUpdated: true,
          tasksRemoved: true,
          createdAt: true,
        },
      })
    } catch {
      // Table may not exist yet
    }

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
      enrichmentAlert: enrichmentAlert ?? null,
      refinementEvents: refinementEvents.map(e => ({
        id: e.id,
        briCategory: e.briCategory,
        tasksAdded: e.tasksAdded,
        tasksUpdated: e.tasksUpdated,
        tasksRemoved: e.tasksRemoved,
        createdAt: e.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching actions data:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch actions data' },
      { status: 500 }
    )
  }
}
