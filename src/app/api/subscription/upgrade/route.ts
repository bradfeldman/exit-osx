import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { PlanTier } from '@prisma/client'
import { stripe, STRIPE_PRICE_MAP } from '@/lib/stripe'

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
    const { targetPlan, billingCycle = 'annual' } = body

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
                stripeCustomerId: true,
                stripeSubscriptionId: true,
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
        { error: 'Can only upgrade to a higher plan. Use Manage Billing to downgrade.' },
        { status: 400 }
      )
    }

    // If workspace already has an active Stripe subscription, update it via Stripe API
    if (workspace.stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId)
      const priceKey = `${targetPlan}-${billingCycle}`
      const newPriceId = STRIPE_PRICE_MAP[priceKey]

      if (!newPriceId) {
        return NextResponse.json({ error: 'Price not found' }, { status: 400 })
      }

      await stripe.subscriptions.update(workspace.stripeSubscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        metadata: { workspaceId: workspace.id, planTier: targetPlanEnum },
        proration_behavior: 'create_prorations',
      })

      // Webhook will handle the DB update, but return success immediately
      return NextResponse.json({
        success: true,
        message: `Upgrading to ${targetPlan}. Changes will apply shortly.`,
      })
    }

    // No Stripe subscription — redirect to Stripe Checkout
    let stripeCustomerId = workspace.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { workspaceId: workspace.id },
      })
      stripeCustomerId = customer.id

      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId: customer.id },
      })
    }

    const priceKey = `${targetPlan}-${billingCycle}`
    const priceId = STRIPE_PRICE_MAP[priceKey]

    if (!priceId) {
      return NextResponse.json({ error: 'Price not found' }, { status: 400 })
    }

    const origin = request.headers.get('origin') || 'https://app.exitosx.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/settings?tab=billing`,
      metadata: { workspaceId: workspace.id, planTier: targetPlanEnum },
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { workspaceId: workspace.id, planTier: targetPlanEnum },
        trial_period_days: 7,
      },
    })

    return NextResponse.json({
      redirectToCheckout: true,
      checkoutUrl: session.url,
    })
  } catch (error) {
    console.error('Error upgrading subscription:', error)
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    )
  }
}
