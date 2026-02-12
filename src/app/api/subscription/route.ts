import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getUserAccessInfo, getCompanyPlanTier } from '@/lib/access'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get companyId from query params if provided
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    // Get user with their workspace's subscription info
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: {
        id: true,
        userType: true,
        workspaces: {
          select: {
            workspace: {
              select: {
                id: true,
                name: true,
                planTier: true,
                subscriptionStatus: true,
                billingCycle: true,
                trialStartedAt: true,
                trialEndsAt: true,
                stripeCustomerId: true,
                stripeSubscriptionId: true,
                _count: {
                  select: {
                    members: true,
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Determine which workspace to use for subscription info
    let workspace

    if (companyId) {
      // If companyId is provided, use that company's workspace
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          workspace: {
            select: {
              id: true,
              name: true,
              planTier: true,
              subscriptionStatus: true,
              billingCycle: true,
              trialStartedAt: true,
              trialEndsAt: true,
              stripeCustomerId: true,
              stripeSubscriptionId: true,
              _count: {
                select: {
                  members: true,
                }
              }
            }
          }
        }
      })

      if (company) {
        workspace = company.workspace
      }
    }

    // Fallback to user's first workspace if no company provided or company not found
    if (!workspace) {
      const workspaceMembership = dbUser.workspaces[0]
      if (!workspaceMembership) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
      }
      workspace = workspaceMembership.workspace
    }

    const now = new Date()

    // Calculate trial days remaining
    let trialDaysRemaining: number | null = null
    const isTrialing = workspace.subscriptionStatus === 'TRIALING'

    if (isTrialing && workspace.trialEndsAt) {
      const msRemaining = workspace.trialEndsAt.getTime() - now.getTime()
      trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
    }

    // Check if trial has expired but status hasn't been updated
    const trialExpired = isTrialing && workspace.trialEndsAt && workspace.trialEndsAt < now

    // Get company-specific access info if companyId provided
    let userRole: 'subscribing_owner' | 'owner' | 'staff' | undefined
    let staffAccess: { hasPFSAccess: boolean; hasRetirementAccess: boolean; hasLoansAccess: boolean } | undefined
    let effectivePlanTier = workspace.planTier.toLowerCase().replace('_', '-') as 'foundation' | 'growth' | 'exit-ready'

    if (companyId) {
      const accessInfo = await getUserAccessInfo(dbUser.id, companyId)
      if (accessInfo) {
        userRole = accessInfo.role
        staffAccess = accessInfo.staffAccess
        // Use company's effective plan tier (considers subscribing owner's subscription)
        effectivePlanTier = await getCompanyPlanTier(companyId)
      }
    }

    // Check if user is COMPED
    const isComped = dbUser.userType === 'COMPED'

    return NextResponse.json({
      subscription: {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        planTier: isComped ? 'exit-ready' : effectivePlanTier,
        status: trialExpired ? 'EXPIRED' : workspace.subscriptionStatus,
        billingCycle: workspace.billingCycle,
        isTrialing: isTrialing && !trialExpired,
        trialStartedAt: workspace.trialStartedAt,
        trialEndsAt: workspace.trialEndsAt,
        trialDaysRemaining: trialExpired ? 0 : trialDaysRemaining,
        teamMemberCount: workspace._count.members,
        hasStripeSubscription: !!workspace.stripeSubscriptionId,
        // New company-based access fields
        userRole,
        staffAccess,
        isComped,
      }
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}
