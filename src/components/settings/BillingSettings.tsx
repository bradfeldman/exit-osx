'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { PRICING_PLANS, getPlan, type PlanTier } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, CreditCard, Sparkles, ArrowRight, AlertCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BillingSettings() {
  const searchParams = useSearchParams()
  const requestedUpgrade = searchParams.get('upgrade') as PlanTier | null
  const checkoutSessionId = searchParams.get('session_id')
  const {
    planTier,
    status,
    isTrialing,
    trialDaysRemaining,
    isLoading,
    refetch,
  } = useSubscription()

  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(requestedUpgrade)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isManagingBilling, setIsManagingBilling] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  const hasTrackedPageView = useRef(false)

  const currentPlanData = getPlan(planTier)

  // Detect checkout success from URL params
  useEffect(() => {
    if (checkoutSessionId) {
      setCheckoutSuccess(true)
      refetch()
      // Clean URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
    }
  }, [checkoutSessionId, refetch])

  // Track billing page view
  useEffect(() => {
    if (hasTrackedPageView.current || isLoading) return
    hasTrackedPageView.current = true

    analytics.track('billing_page_viewed', {
      currentPlan: planTier,
      isTrialing,
      trialDaysRemaining: trialDaysRemaining ?? null,
      requestedUpgrade,
    })
  }, [isLoading, planTier, isTrialing, trialDaysRemaining, requestedUpgrade])

  const handleUpgrade = async (targetPlan: PlanTier) => {
    const previousPlan = planTier

    setIsUpgrading(true)
    setSelectedPlan(targetPlan)

    analytics.track('plan_upgrade_initiated', {
      currentPlan: planTier,
      targetPlan,
      billingCycle,
      isTrialing,
      triggerSource: requestedUpgrade ? 'upgrade_modal' : 'billing_page',
    })

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: targetPlan, billingCycle }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url
          return
        }
      } else {
        const error = await response.json()
        const errorMessage = error.detail || error.error || 'Failed to start checkout. Please try again.'
        console.error('Checkout error:', error)

        analytics.track('plan_upgrade_failed', {
          currentPlan: previousPlan,
          targetPlan,
          errorMessage,
        })

        alert(errorMessage)
      }
    } catch (error) {
      console.error('Upgrade failed:', error)

      analytics.track('plan_upgrade_failed', {
        currentPlan: planTier,
        targetPlan,
        errorMessage: 'Network error or unexpected failure',
      })

      alert('Failed to start checkout. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleManageBilling = async () => {
    setIsManagingBilling(true)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to open billing portal.')
      }
    } catch (error) {
      console.error('Portal failed:', error)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setIsManagingBilling(false)
    }
  }

  // Check if workspace has Stripe subscription (derived from plan + status)
  const hasStripeSubscription = status === 'ACTIVE' || status === 'PAST_DUE' || (isTrialing && planTier !== 'foundation')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Checkout Success Message */}
      {checkoutSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Subscription activated!</p>
              <p className="text-sm text-green-600">
                Welcome to {currentPlanData?.name}. You now have full access to all plan features.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Plan
            {isTrialing && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                <Clock className="mr-1 h-3 w-3" />
                Trial
              </Badge>
            )}
            {status === 'PAST_DUE' && (
              <Badge variant="destructive">
                <AlertCircle className="mr-1 h-3 w-3" />
                Past Due
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isTrialing && trialDaysRemaining !== null
              ? `Your trial ends in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}`
              : status === 'PAST_DUE'
              ? 'Please update your payment method to continue service'
              : 'Your active subscription plan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold">{currentPlanData?.name || 'Foundation'}</h3>
              <p className="text-muted-foreground">
                {currentPlanData?.description || 'Free plan with basic features'}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-3xl font-bold">
                ${billingCycle === 'annual' ? (currentPlanData?.annualPrice || 0) : (currentPlanData?.monthlyPrice || 0)}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              {(currentPlanData?.annualPrice || 0) > 0 && (
                <p className="text-sm text-muted-foreground">
                  billed {billingCycle === 'annual' ? 'annually' : 'monthly'}
                </p>
              )}
            </div>
          </div>

          {status === 'EXPIRED' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Your trial has expired. Upgrade to continue using premium features.</span>
            </div>
          )}

          {/* Manage Billing button — only shown if user has a Stripe subscription */}
          {hasStripeSubscription && planTier !== 'foundation' && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={isManagingBilling}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {isManagingBilling ? 'Opening...' : 'Manage Billing'}
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold">
            {planTier === 'exit-ready' ? 'Your Plan' : 'Upgrade Your Plan'}
          </h2>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center gap-3">
            <span className={cn(
              'text-sm font-medium transition-colors',
              billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                billingCycle === 'annual' ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-background shadow-sm transition-transform',
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            <span className={cn(
              'text-sm font-medium transition-colors',
              billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'
            )}>
              Annual
              <span className="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === planTier
            const isDowngrade =
              (planTier === 'exit-ready' && plan.id !== 'exit-ready') ||
              (planTier === 'growth' && plan.id === 'foundation')
            const canUpgrade = !isCurrentPlan && !isDowngrade
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative transition-all',
                  isCurrentPlan && 'border-primary ring-1 ring-primary',
                  plan.highlighted && !isCurrentPlan && 'border-primary/50',
                  selectedPlan === plan.id && 'ring-2 ring-primary'
                )}
              >
                {plan.highlighted && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary">Current Plan</Badge>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  {price > 0 && billingCycle === 'annual' && (
                    <p className="text-xs text-muted-foreground">
                      billed annually at ${(price * 12).toLocaleString()}/yr
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <ul className="space-y-2 text-sm">
                    {plan.features.slice(0, 5).map((feature) => (
                      <li
                        key={feature.name}
                        className={cn(
                          'flex items-center gap-2',
                          !feature.included && 'text-muted-foreground/50'
                        )}
                      >
                        <Check
                          className={cn(
                            'h-4 w-4',
                            feature.included ? 'text-green-600' : 'text-muted-foreground/30'
                          )}
                        />
                        <span>{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                  {canUpgrade ? (
                    <Button
                      className="w-full"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading && selectedPlan === plan.id ? (
                        'Redirecting...'
                      ) : isTrialing ? (
                        <>
                          Upgrade Trial
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      ) : planTier === 'foundation' ? (
                        <>
                          Start 7-Day Free Trial
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Upgrade
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button className="w-full" variant="secondary" disabled>
                      Current Plan
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      className="w-full"
                      variant="ghost"
                      onClick={handleManageBilling}
                      disabled={isManagingBilling || !hasStripeSubscription}
                    >
                      {hasStripeSubscription ? 'Manage in Billing Portal' : 'N/A'}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="ghost" disabled>
                      N/A
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Trial Notice */}
      {isTrialing && (
        <p className="text-center text-sm text-muted-foreground">
          You won&apos;t be charged until your trial ends.{' '}
          {trialDaysRemaining !== null && `${trialDaysRemaining} days remaining.`}
        </p>
      )}
    </div>
  )
}
