import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PlanTier } from '@prisma/client'

// Map plan ID to Prisma PlanTier enum
function getPlanTierEnum(planId: string): PlanTier | null {
  switch (planId) {
    case 'foundation':
      return 'FOUNDATION'
    case 'growth':
      return 'GROWTH'
    case 'exit-ready':
      return 'EXIT_READY'
    default:
      return null
  }
}

// Plan hierarchy for validation
const PLAN_HIERARCHY = ['foundation', 'growth', 'exit-ready']

function isUpgrade(currentPlan: string, targetPlan: string): boolean {
  const currentIndex = PLAN_HIERARCHY.indexOf(currentPlan.toLowerCase().replace('_', '-'))
  const targetIndex = PLAN_HIERARCHY.indexOf(targetPlan.toLowerCase().replace('_', '-'))
  return targetIndex > currentIndex
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { targetPlan } = body

    if (!targetPlan) {
      return NextResponse.json({ error: 'Target plan is required' }, { status: 400 })
    }

    const targetPlanEnum = getPlanTierEnum(targetPlan)
    if (!targetPlanEnum) {
      return NextResponse.json({ error: 'Invalid target plan' }, { status: 400 })
    }

    // Get user's workspace
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: {
        workspaces: {
          select: {
            workspace: {
              select: {
                id: true,
                planTier: true,
                subscriptionStatus: true,
                trialEndsAt: true,
              }
            }
          }
        }
      }
    })

    if (!dbUser || !dbUser.workspaces[0]) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const workspace = dbUser.workspaces[0].workspace
    const currentPlanId = workspace.planTier.toLowerCase().replace('_', '-')

    // Validate this is an upgrade, not a downgrade
    if (!isUpgrade(currentPlanId, targetPlan)) {
      return NextResponse.json(
        { error: 'Can only upgrade to a higher plan. Contact support to downgrade.' },
        { status: 400 }
      )
    }

    // Determine new subscription status and trial dates
    const now = new Date()
    let newStatus = workspace.subscriptionStatus
    let trialStartedAt = null
    let trialEndsAt = workspace.trialEndsAt

    // If user is on Foundation (free), start a new 14-day trial
    if (workspace.planTier === 'FOUNDATION') {
      newStatus = 'TRIALING'
      trialStartedAt = now
      trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days
    }
    // If user is already trialing, keep the existing trial end date (no extra time)
    // If user is on a paid plan, they stay on ACTIVE status

    // Update the workspace's plan
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        planTier: targetPlanEnum,
        subscriptionStatus: newStatus,
        ...(trialStartedAt && { trialStartedAt }),
        ...(trialEndsAt && { trialEndsAt }),
        billingCycle: 'ANNUAL', // Default to annual
      }
    })

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${targetPlan}`,
      subscription: {
        planTier: targetPlan,
        status: newStatus,
        trialEndsAt,
      }
    })
  } catch (error) {
    console.error('Error upgrading subscription:', error)
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    )
  }
}
