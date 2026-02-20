import { NextResponse } from 'next/server'
import { stripe, getPlanTierFromPriceId, getBillingCycleFromPriceId } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Stripe Webhook] Signature verification failed: ${message}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err instanceof Error ? err.message : String(err))
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId
  const planTier = session.metadata?.planTier

  if (!workspaceId) {
    console.error('[Stripe Webhook] checkout.session.completed missing workspaceId in metadata')
    return
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id

  if (!subscriptionId || !customerId) {
    console.error('[Stripe Webhook] checkout.session.completed missing subscription or customer ID')
    return
  }

  // Fetch the subscription to get status and price details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price?.id

  const resolvedPlanTier = planTier === 'DEAL_ROOM' || planTier === 'GROWTH'
    ? planTier
    : (priceId ? getPlanTierFromPriceId(priceId) : null)

  const billingCycle = priceId ? getBillingCycleFromPriceId(priceId) : 'ANNUAL'

  const subscriptionStatus = subscription.status === 'trialing' ? 'TRIALING' : 'ACTIVE'

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      ...(resolvedPlanTier && { planTier: resolvedPlanTier }),
      subscriptionStatus,
      ...(billingCycle && { billingCycle }),
      ...(subscription.trial_end && {
        trialEndsAt: new Date(subscription.trial_end * 1000),
      }),
    },
  })

  console.log(`[Stripe Webhook] checkout.session.completed: workspace=${workspaceId}, plan=${resolvedPlanTier}, status=${subscriptionStatus}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const workspace = await prisma.workspace.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!workspace) {
    console.error(`[Stripe Webhook] customer.subscription.updated: no workspace found for subscription ${subscription.id}`)
    return
  }

  const priceId = subscription.items.data[0]?.price?.id
  const planTier = priceId ? getPlanTierFromPriceId(priceId) : null
  const billingCycle = priceId ? getBillingCycleFromPriceId(priceId) : null

  // Map Stripe status to our SubscriptionStatus enum
  let subscriptionStatus: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED'
  switch (subscription.status) {
    case 'active':
      subscriptionStatus = 'ACTIVE'
      break
    case 'trialing':
      subscriptionStatus = 'TRIALING'
      break
    case 'past_due':
      subscriptionStatus = 'PAST_DUE'
      break
    case 'canceled':
    case 'unpaid':
      subscriptionStatus = 'CANCELLED'
      break
    default:
      subscriptionStatus = 'ACTIVE'
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      subscriptionStatus,
      ...(planTier && { planTier }),
      ...(billingCycle && { billingCycle }),
      ...(subscription.trial_end && {
        trialEndsAt: new Date(subscription.trial_end * 1000),
      }),
    },
  })

  console.log(`[Stripe Webhook] customer.subscription.updated: workspace=${workspace.id}, status=${subscriptionStatus}, plan=${planTier}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const workspace = await prisma.workspace.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!workspace) {
    console.error(`[Stripe Webhook] customer.subscription.deleted: no workspace found for subscription ${subscription.id}`)
    return
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      planTier: 'FOUNDATION',
      subscriptionStatus: 'CANCELLED',
      stripeSubscriptionId: null,
      billingCycle: null,
    },
  })

  console.log(`[Stripe Webhook] customer.subscription.deleted: workspace=${workspace.id} → FOUNDATION`)
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return

  const workspace = await prisma.workspace.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!workspace) {
    console.error(`[Stripe Webhook] invoice.payment_failed: no workspace found for subscription ${subscriptionId}`)
    return
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { subscriptionStatus: 'PAST_DUE' },
  })

  console.log(`[Stripe Webhook] invoice.payment_failed: workspace=${workspace.id} → PAST_DUE`)
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice)
  if (!subscriptionId) return

  const workspace = await prisma.workspace.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!workspace) return

  // Only recover from PAST_DUE — don't override TRIALING
  if (workspace.subscriptionStatus === 'PAST_DUE') {
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { subscriptionStatus: 'ACTIVE' },
    })

    console.log(`[Stripe Webhook] invoice.paid: workspace=${workspace.id} → ACTIVE (recovered from PAST_DUE)`)
  }
}
