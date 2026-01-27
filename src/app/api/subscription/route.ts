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

    // Get user with their organization's subscription info
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: {
        id: true,
        userType: true,
        organizations: {
          select: {
            organization: {
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
                    users: true,
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

    // Determine which organization to use for subscription info
    let org

    if (companyId) {
      // If companyId is provided, use that company's organization
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          organization: {
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
                  users: true,
                }
              }
            }
          }
        }
      })

      if (company) {
        org = company.organization
      }
    }

    // Fallback to user's first organization if no company provided or company not found
    if (!org) {
      const orgMembership = dbUser.organizations[0]
      if (!orgMembership) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 })
      }
      org = orgMembership.organization
    }

    const now = new Date()

    // Calculate trial days remaining
    let trialDaysRemaining: number | null = null
    const isTrialing = org.subscriptionStatus === 'TRIALING'

    if (isTrialing && org.trialEndsAt) {
      const msRemaining = org.trialEndsAt.getTime() - now.getTime()
      trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
    }

    // Check if trial has expired but status hasn't been updated
    const trialExpired = isTrialing && org.trialEndsAt && org.trialEndsAt < now

    // Get company-specific access info if companyId provided
    let userRole: 'subscribing_owner' | 'owner' | 'staff' | undefined
    let staffAccess: { hasPFSAccess: boolean; hasRetirementAccess: boolean; hasLoansAccess: boolean } | undefined
    let effectivePlanTier = org.planTier.toLowerCase().replace('_', '-') as 'foundation' | 'growth' | 'exit-ready'

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
        organizationId: org.id,
        organizationName: org.name,
        planTier: isComped ? 'exit-ready' : effectivePlanTier,
        status: trialExpired ? 'EXPIRED' : org.subscriptionStatus,
        billingCycle: org.billingCycle,
        isTrialing: isTrialing && !trialExpired,
        trialStartedAt: org.trialStartedAt,
        trialEndsAt: org.trialEndsAt,
        trialDaysRemaining: trialExpired ? 0 : trialDaysRemaining,
        teamMemberCount: org._count.users,
        hasStripeSubscription: !!org.stripeSubscriptionId,
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
