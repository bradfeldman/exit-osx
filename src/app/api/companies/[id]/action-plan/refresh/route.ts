/**
 * Update Action Plan API
 *
 * POST /api/companies/[id]/action-plan/refresh
 *
 * Refreshes the action plan by filling available slots (up to 15) from the task queue.
 * Existing non-completed/non-deferred tasks remain in the action plan.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { updateActionPlan, getActionPlanCount } from '@/lib/tasks/action-plan'
import { MAX_ACTION_PLAN_TASKS } from '@/lib/tasks/priority-matrix'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: companyId } = await params

  try {
    // Verify user has access to this company
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: { companies: { where: { id: companyId } } }
            }
          }
        }
      }
    })

    const hasAccess = dbUser?.workspaces.some(
      ws => ws.workspace.companies.length > 0
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current action plan count
    const currentCount = await getActionPlanCount(companyId)

    // Check if action plan is already full
    if (currentCount >= MAX_ACTION_PLAN_TASKS) {
      return NextResponse.json({
        success: true,
        message: `Action plan is already at maximum capacity (${MAX_ACTION_PLAN_TASKS} tasks)`,
        added: 0,
        total: currentCount,
        maxCapacity: MAX_ACTION_PLAN_TASKS,
      })
    }

    // Update the action plan
    const result = await updateActionPlan(companyId)

    // Get queue count for response
    const queueCount = await prisma.task.count({
      where: {
        companyId,
        inActionPlan: false,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'DEFERRED', 'NOT_APPLICABLE'] },
      },
    })

    return NextResponse.json({
      success: true,
      message: result.message,
      added: result.added,
      total: result.total,
      queueRemaining: queueCount,
      maxCapacity: MAX_ACTION_PLAN_TASKS,
    })
  } catch (error) {
    console.error('Error refreshing action plan:', error)
    return NextResponse.json(
      { error: 'Failed to refresh action plan' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: companyId } = await params

  try {
    // Verify user has access
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        workspaces: {
          include: {
            workspace: {
              include: { companies: { where: { id: companyId } } }
            }
          }
        }
      }
    })

    const hasAccess = dbUser?.workspaces.some(
      ws => ws.workspace.companies.length > 0
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get action plan status
    const actionPlanCount = await getActionPlanCount(companyId)
    const queueCount = await prisma.task.count({
      where: {
        companyId,
        inActionPlan: false,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'DEFERRED', 'NOT_APPLICABLE'] },
      },
    })

    return NextResponse.json({
      actionPlanCount,
      queueCount,
      maxCapacity: MAX_ACTION_PLAN_TASKS,
      slotsAvailable: MAX_ACTION_PLAN_TASKS - actionPlanCount,
      canRefresh: actionPlanCount < MAX_ACTION_PLAN_TASKS && queueCount > 0,
    })
  } catch (error) {
    console.error('Error getting action plan status:', error)
    return NextResponse.json(
      { error: 'Failed to get action plan status' },
      { status: 500 }
    )
  }
}
