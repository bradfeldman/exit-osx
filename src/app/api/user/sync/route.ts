import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getGravatarUrl } from '@/lib/utils/gravatar'
import { PlanTier, SubscriptionStatus, BillingCycle } from '@prisma/client'

// Map plan ID to Prisma PlanTier enum
function getPlanTier(planId: string): PlanTier {
  switch (planId) {
    case 'growth':
      return 'GROWTH'
    case 'exit-ready':
      return 'EXIT_READY'
    default:
      return 'FOUNDATION'
  }
}

// Get subscription config based on selected plan
function getSubscriptionConfig(planId: string): {
  planTier: PlanTier
  subscriptionStatus: SubscriptionStatus
  billingCycle: BillingCycle | null
  trialStartedAt: Date | null
  trialEndsAt: Date | null
} {
  const planTier = getPlanTier(planId)
  const now = new Date()
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days from now

  if (planTier === 'FOUNDATION') {
    return {
      planTier: 'FOUNDATION',
      subscriptionStatus: 'ACTIVE',
      billingCycle: null,
      trialStartedAt: null,
      trialEndsAt: null,
    }
  }

  // Paid plans start with a 14-day trial
  return {
    planTier,
    subscriptionStatus: 'TRIALING',
    billingCycle: 'ANNUAL', // Default to annual (better value)
    trialStartedAt: now,
    trialEndsAt: trialEnd,
  }
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user already exists by authId
    let existingUser = await prisma.user.findUnique({
      where: { authId: user.id },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                companies: true
              }
            }
          }
        }
      }
    })

    // If not found by authId, check by email (user may have signed up with different auth method)
    if (!existingUser && user.email) {
      existingUser = await prisma.user.findUnique({
        where: { email: user.email },
        include: {
          organizations: {
            include: {
              organization: {
                include: {
                  companies: true
                }
              }
            }
          }
        }
      })

      // If found by email, update the authId to link this auth method
      if (existingUser) {
        existingUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { authId: user.id },
          include: {
            organizations: {
              include: {
                organization: {
                  include: {
                    companies: true
                  }
                }
              }
            }
          }
        })
        return NextResponse.json({
          user: existingUser,
          isNew: false
        })
      }
    }

    if (existingUser) {
      // Check for pending invites for this user's email
      const pendingInvite = await prisma.organizationInvite.findFirst({
        where: {
          email: { equals: user.email!, mode: 'insensitive' },
          acceptedAt: null,
          expiresAt: { gt: new Date() }
        },
        select: { token: true, organization: { select: { name: true } } }
      })

      // Update avatar URL if missing
      if (!existingUser.avatarUrl) {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            avatarUrl: user.user_metadata?.avatar_url || getGravatarUrl(user.email!, { size: 200 })
          },
          include: {
            organizations: {
              include: {
                organization: {
                  include: {
                    companies: true
                  }
                }
              }
            }
          }
        })
        return NextResponse.json({
          user: updatedUser,
          isNew: false,
          pendingInvite: pendingInvite ? {
            token: pendingInvite.token,
            organizationName: pendingInvite.organization.name
          } : null
        })
      }

      return NextResponse.json({
        user: existingUser,
        isNew: false,
        pendingInvite: pendingInvite ? {
          token: pendingInvite.token,
          organizationName: pendingInvite.organization.name
        } : null
      })
    }

    // Create new user with a default organization
    // Use OAuth avatar if available, otherwise generate Gravatar URL
    const avatarUrl = user.user_metadata?.avatar_url || getGravatarUrl(user.email!, { size: 200 })

    // Get selected plan from user metadata (set during signup)
    const selectedPlan = user.user_metadata?.selected_plan || 'foundation'
    const subscriptionConfig = getSubscriptionConfig(selectedPlan)

    const newUser = await prisma.user.create({
      data: {
        authId: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.user_metadata?.full_name,
        avatarUrl,
        organizations: {
          create: {
            role: 'ADMIN',
            organization: {
              create: {
                name: user.user_metadata?.name
                  ? `${user.user_metadata.name}'s Organization`
                  : 'My Organization',
                // Apply subscription configuration based on selected plan
                planTier: subscriptionConfig.planTier,
                subscriptionStatus: subscriptionConfig.subscriptionStatus,
                billingCycle: subscriptionConfig.billingCycle,
                trialStartedAt: subscriptionConfig.trialStartedAt,
                trialEndsAt: subscriptionConfig.trialEndsAt,
              }
            }
          }
        }
      },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                companies: true
              }
            }
          }
        }
      }
    })

    // Check for pending invites for this new user's email
    const pendingInvite = await prisma.organizationInvite.findFirst({
      where: {
        email: { equals: user.email!, mode: 'insensitive' },
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      },
      select: { token: true, organization: { select: { name: true } } }
    })

    return NextResponse.json({
      user: newUser,
      isNew: true,
      pendingInvite: pendingInvite ? {
        token: pendingInvite.token,
        organizationName: pendingInvite.organization.name
      } : null
    })
  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
