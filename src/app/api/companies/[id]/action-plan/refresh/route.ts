/**
 * Update Action Plan API
 *
 * POST /api/companies/[id]/action-plan/refresh
 *
 * Refreshes the action plan by filling available slots (up to 15) from the task queue.
 * Existing non-completed/non-deferred tasks remain in the action plan.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { updateActionPlan, getActionPlanCount } from '@/lib/tasks/action-plan'
import { MAX_ACTION_PLAN_TASKS } from '@/lib/tasks/priority-matrix'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  // SEC-077: Use standard checkPermission instead of ad-hoc auth
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {

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
    const refreshResult = await updateActionPlan(companyId)

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
      message: refreshResult.message,
      added: refreshResult.added,
      total: refreshResult.total,
      queueRemaining: queueCount,
      maxCapacity: MAX_ACTION_PLAN_TASKS,
    })
  } catch (error) {
    console.error('Error refreshing action plan:', error instanceof Error ? error.message : String(error))
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
  const { id: companyId } = await params

  // SEC-077: Use standard checkPermission instead of ad-hoc auth
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {

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
    console.error('Error getting action plan status:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to get action plan status' },
      { status: 500 }
    )
  }
}
