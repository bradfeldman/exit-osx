import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { stripe, STRIPE_PRICE_MAP } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { planId, billingCycle = 'annual' } = body as {
      planId: 'growth' | 'exit-ready'
      billingCycle: 'monthly' | 'annual'
    }

    if (!planId || !['growth', 'exit-ready'].includes(planId)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (!['monthly', 'annual'].includes(billingCycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
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

    // Find or create Stripe customer
    let stripeCustomerId = workspace.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { workspaceId: workspace.id },
      })
      stripeCustomerId = customer.id

      // Store customer ID immediately
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId: customer.id },
      })
    }

    // Look up price ID
    const priceKey = `${planId}-${billingCycle}`
    const priceId = STRIPE_PRICE_MAP[priceKey]

    if (!priceId) {
      return NextResponse.json({ error: 'Price not found' }, { status: 400 })
    }

    // Determine plan tier for metadata
    const planTier = planId === 'exit-ready' ? 'EXIT_READY' : 'GROWTH'

    // Only offer trial if workspace has never had a Stripe subscription
    const hasHadSubscription = !!workspace.stripeSubscriptionId

    const origin = request.headers.get('origin') || 'https://app.exitosx.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/settings?tab=billing`,
      metadata: { workspaceId: workspace.id, planTier },
      allow_promotion_codes: true,
      subscription_data: {
        metadata: { workspaceId: workspace.id, planTier },
        ...(!hasHadSubscription && { trial_period_days: 7 }),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
