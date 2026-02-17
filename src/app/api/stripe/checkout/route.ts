import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { stripe, STRIPE_PRICE_MAP } from '@/lib/stripe'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const postSchema = z.object({
  planId: z.enum(['growth', 'exit-ready']),
  billingCycle: z.enum(['monthly', 'annual']).default('annual'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const validation = await validateRequestBody(request, postSchema)
  if (!validation.success) return validation.error
  const { planId, billingCycle } = validation.data

  try {

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

    const isTrialEligible = !hasHadSubscription

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/settings?tab=billing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/settings?tab=billing`,
      metadata: { workspaceId: workspace.id, planTier },
      allow_promotion_codes: true,
      // No credit card required during trial — collect payment at conversion
      ...(isTrialEligible && { payment_method_collection: 'if_required' as const }),
      subscription_data: {
        metadata: { workspaceId: workspace.id, planTier },
        ...(isTrialEligible && { trial_period_days: 7 }),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const stripeCode = (error as { code?: string })?.code
    const stripeType = (error as { type?: string })?.type
    console.error('Error creating checkout session:', errorMessage, { stripeCode, stripeType })
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        detail: errorMessage,
        stripeCode: stripeCode || null,
      },
      { status: 500 }
    )
  }
}
