import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user with their organization's subscription info
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: {
        id: true,
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

    // Get the first organization (most users have one)
    const orgMembership = dbUser.organizations[0]
    if (!orgMembership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const org = orgMembership.organization
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

    return NextResponse.json({
      subscription: {
        organizationId: org.id,
        organizationName: org.name,
        planTier: org.planTier.toLowerCase().replace('_', '-') as 'foundation' | 'growth' | 'exit-ready',
        status: trialExpired ? 'EXPIRED' : org.subscriptionStatus,
        billingCycle: org.billingCycle,
        isTrialing: isTrialing && !trialExpired,
        trialStartedAt: org.trialStartedAt,
        trialEndsAt: org.trialEndsAt,
        trialDaysRemaining: trialExpired ? 0 : trialDaysRemaining,
        teamMemberCount: org._count.users,
        hasStripeSubscription: !!org.stripeSubscriptionId,
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
