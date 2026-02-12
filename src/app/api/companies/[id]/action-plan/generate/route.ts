/**
 * Generate Action Plan API
 *
 * POST /api/companies/[id]/action-plan/generate
 *
 * Generates a new action plan with specified due date and carry-forward options.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { generateActionPlan } from '@/lib/tasks/action-plan'

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
    // Parse request body
    const body = await request.json()
    const { dueDate, carryForward } = body

    if (!dueDate) {
      return NextResponse.json({ error: 'Due date is required' }, { status: 400 })
    }

    // Validate due date is within 90 days
    const dueDateObj = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)

    if (dueDateObj < today || dueDateObj > maxDate) {
      return NextResponse.json(
        { error: 'Due date must be between today and 90 days from now' },
        { status: 400 }
      )
    }

    // Verify user has access to this company and get user ID
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

    if (!hasAccess || !dbUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the company's workspace to check user count
    const _company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { workspaceId: true },
    })

    // Determine default assignee
    // Use current user as default assignee
    const defaultAssigneeId: string | null = dbUser.id

    // Generate the action plan
    const result = await generateActionPlan(
      companyId,
      dueDateObj,
      carryForward ?? false,
      defaultAssigneeId
    )

    return NextResponse.json({
      success: result.success,
      message: result.message,
      tasksInPlan: result.tasksInPlan,
      tasksCarriedForward: result.tasksCarriedForward,
      newTasksAdded: result.newTasksAdded,
    })
  } catch (error) {
    console.error('Error generating action plan:', error)
    return NextResponse.json(
      { error: 'Failed to generate action plan' },
      { status: 500 }
    )
  }
}
