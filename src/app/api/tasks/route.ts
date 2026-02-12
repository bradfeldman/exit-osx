import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// Issue tier priority: CRITICAL > SIGNIFICANT > OPTIMIZATION
const TIER_PRIORITY: Record<string, number> = {
  CRITICAL: 3,
  SIGNIFICANT: 2,
  OPTIMIZATION: 1,
}

// Calculate priority score: higher = better
// First by tier (CRITICAL > SIGNIFICANT > OPTIMIZATION), then by effort (low effort first)
function calculatePriorityScore(issueTier: string | null, effortLevel: string): number {
  // Tier score (1-3): CRITICAL is highest priority
  const tierScore = TIER_PRIORITY[issueTier || 'OPTIMIZATION'] || 1

  // Effort penalty (1-5): lower is better
  const effortPenalty: Record<string, number> = {
    MINIMAL: 1,
    LOW: 2,
    MODERATE: 3,
    HIGH: 4,
    MAJOR: 5,
  }
  const penalty = effortPenalty[effortLevel] || 3

  // Priority = tier * 10 - effort (range: 5 to 29)
  // CRITICAL / Minimal Effort = 29 (best)
  // OPTIMIZATION / Major Effort = 5 (worst)
  return tierScore * 10 - penalty
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const includeQueue = searchParams.get('includeQueue') === 'true' // Default: only action plan tasks
  const assignedToMe = searchParams.get('assignedToMe') === 'true' // Filter to tasks assigned to current user

  if (!companyId) {
    return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
  }

  try {
    // Verify user has access
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        workspace: {
          include: {
            members: {
              where: { user: { authId: user.id } },
            },
          },
        },
      },
    })

    if (!company || company.workspace.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the current user's internal ID for assignee filtering
    let currentUserId: string | null = null
    if (assignedToMe) {
      const dbUser = await prisma.user.findUnique({
        where: { authId: user.id },
        select: { id: true },
      })
      currentUserId = dbUser?.id || null
    }

    // Build filter
    const where: Record<string, unknown> = { companyId }

    // Filter to tasks assigned to current user
    if (assignedToMe && currentUserId) {
      where.primaryAssigneeId = currentUserId
    }

    // By default, only show tasks in the action plan (not the hidden queue)
    // If completed/cancelled is filtered, include all regardless of action plan status
    if (!includeQueue && status !== 'COMPLETED' && status !== 'CANCELLED') {
      where.inActionPlan = true
    }

    if (status) {
      where.status = status
    }
    if (category) {
      where.briCategory = category
    }

    const tasksUnsorted = await prisma.task.findMany({
      where,
      include: {
        primaryAssignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
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
          where: { status: 'CURRENT' },
          select: {
            id: true,
            fileName: true,
            filePath: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    // Sort by priority rank (lower = higher priority), then by raw impact
    const tasks = tasksUnsorted.sort((a, b) => {
      // Primary: Use the new priority rank (1-25, lower = higher priority)
      const rankA = a.priorityRank ?? 25
      const rankB = b.priorityRank ?? 25
      if (rankA !== rankB) return rankA - rankB

      // Fallback to old priority calculation for tasks without priorityRank
      const priorityA = calculatePriorityScore(a.issueTier, a.effortLevel)
      const priorityB = calculatePriorityScore(b.issueTier, b.effortLevel)
      if (priorityB !== priorityA) return priorityB - priorityA

      // Secondary sort by raw impact (higher value first within same priority)
      const impactDiff = Number(b.rawImpact) - Number(a.rawImpact)
      if (impactDiff !== 0) return impactDiff

      // Tertiary sort by creation date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    // Calculate summary stats
    const allTasks = await prisma.task.findMany({
      where: { companyId },
      select: { status: true, rawImpact: true, inActionPlan: true },
    })

    // Count tasks in action plan vs queue
    const actionPlanTasks = allTasks.filter(t => t.inActionPlan && !['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'].includes(t.status))
    const queuedTasks = allTasks.filter(t => !t.inActionPlan && !['COMPLETED', 'CANCELLED', 'DEFERRED', 'NOT_APPLICABLE'].includes(t.status))

    const stats = {
      total: allTasks.length,
      pending: allTasks.filter(t => t.status === 'PENDING').length,
      inProgress: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: allTasks.filter(t => t.status === 'COMPLETED').length,
      totalValue: allTasks.reduce((sum, t) => sum + Number(t.rawImpact), 0),
      completedValue: allTasks
        .filter(t => t.status === 'COMPLETED')
        .reduce((sum, t) => sum + Number(t.rawImpact), 0),
      // Action plan stats
      inActionPlan: actionPlanTasks.length,
      inQueue: queuedTasks.length,
      maxActionPlan: 15,
      canRefresh: actionPlanTasks.length < 15 && queuedTasks.length > 0,
    }

    return NextResponse.json({ tasks, stats })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}
