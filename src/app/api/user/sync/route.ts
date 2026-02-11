import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getGravatarUrl } from '@/lib/utils/gravatar'
import { PlanTier, SubscriptionStatus, BillingCycle } from '@prisma/client'
import { serverAnalytics } from '@/lib/analytics/server'

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

// Get subscription config for new users
// All new signups get EXIT_READY tier with a 14-day trial, regardless of selected plan
function getSubscriptionConfig(_planId: string): {
  planTier: PlanTier
  subscriptionStatus: SubscriptionStatus
  billingCycle: BillingCycle | null
  trialStartedAt: Date | null
  trialEndsAt: Date | null
} {
  const now = new Date()
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days from now

  // All new users start with EXIT_READY on a 14-day trial
  // This gives them full access to evaluate all features before choosing a plan
  return {
    planTier: 'EXIT_READY',
    subscriptionStatus: 'TRIALING',
    billingCycle: 'ANNUAL',
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

    // Use OAuth avatar if available, otherwise generate Gravatar URL
    const avatarUrl = user.user_metadata?.avatar_url || getGravatarUrl(user.email!, { size: 200 })

    // Check for pending invites BEFORE creating user
    // If user has a pending invite, don't create a personal organization
    const pendingInvite = await prisma.organizationInvite.findFirst({
      where: {
        email: { equals: user.email!, mode: 'insensitive' },
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      },
      select: { token: true, organization: { select: { name: true } } }
    })

    // If user has a pending invite, create user WITHOUT a personal organization
    // They will be added to the invited organization when they accept the invite
    if (pendingInvite) {
      const newUser = await prisma.user.create({
        data: {
          authId: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.user_metadata?.full_name,
          avatarUrl,
          // No organizations created - user will join via invite acceptance
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

      // Track user created (non-blocking)
      serverAnalytics.auth.userCreated({
        userId: newUser.id,
        authId: newUser.authId,
      }).catch(() => {})

      return NextResponse.json({
        user: newUser,
        isNew: true,
        pendingInvite: {
          token: pendingInvite.token,
          organizationName: pendingInvite.organization.name
        }
      })
    }

    // No pending invite - create user with a default personal organization
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

    // Track user created (non-blocking)
    serverAnalytics.auth.userCreated({
      userId: newUser.id,
      authId: newUser.authId,
    }).catch(() => {})

    return NextResponse.json({
      user: newUser,
      isNew: true,
      pendingInvite: null
    })
  } catch (error) {
    console.error('Error syncing user:', error)
    // SECURITY FIX (PROD-060): Removed error.message from response to prevent leaking internal details
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
