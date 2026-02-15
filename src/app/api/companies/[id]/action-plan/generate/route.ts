/**
 * Generate Action Plan API
 *
 * POST /api/companies/[id]/action-plan/generate
 *
 * Generates a new action plan with specified due date and carry-forward options.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { generateActionPlan } from '@/lib/tasks/action-plan'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

// SEC-078: Zod schema for action plan generation
const generateActionPlanSchema = z.object({
  dueDate: z.string().min(1),
  carryForward: z.boolean().default(false),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  // SEC-077: Use standard checkPermission instead of ad-hoc auth
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    // SEC-078: Zod validated input
    const validation = await validateRequestBody(request, generateActionPlanSchema)
    if (!validation.success) return validation.error
    const { dueDate, carryForward } = validation.data

    // Validate due date is within 90 days
    const dueDateObj = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)

    if (isNaN(dueDateObj.getTime()) || dueDateObj < today || dueDateObj > maxDate) {
      return NextResponse.json(
        { error: 'Due date must be between today and 90 days from now' },
        { status: 400 }
      )
    }

    // Use current user as default assignee
    const defaultAssigneeId: string | null = result.auth.user.id

    // Generate the action plan
    const planResult = await generateActionPlan(
      companyId,
      dueDateObj,
      carryForward ?? false,
      defaultAssigneeId
    )

    return NextResponse.json({
      success: planResult.success,
      message: planResult.message,
      tasksInPlan: planResult.tasksInPlan,
      tasksCarriedForward: planResult.tasksCarriedForward,
      newTasksAdded: planResult.newTasksAdded,
    })
  } catch (error) {
    console.error('Error generating action plan:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to generate action plan' },
      { status: 500 }
    )
  }
}
