'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { PRICING_PLANS, getPlan, type PlanTier } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, CreditCard, Sparkles, ArrowRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BillingSettings() {
  const searchParams = useSearchParams()
  const requestedUpgrade = searchParams.get('upgrade') as PlanTier | null
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
  const [upgradeSuccess, setUpgradeSuccess] = useState(false)

  const hasTrackedPageView = useRef(false)

  const currentPlanData = getPlan(planTier)

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
    const wasTrialingBefore = isTrialing

    setIsUpgrading(true)
    setSelectedPlan(targetPlan)

    // Track upgrade initiated
    analytics.track('plan_upgrade_initiated', {
      currentPlan: planTier,
      targetPlan,
      isTrialing,
      triggerSource: requestedUpgrade ? 'upgrade_modal' : 'billing_page',
    })

    try {
      const response = await fetch('/api/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan }),
      })

      if (response.ok) {
        setUpgradeSuccess(true)
        await refetch()

        // Track upgrade completed
        analytics.track('plan_upgrade_completed', {
          previousPlan,
          newPlan: targetPlan,
          wasTrialing: wasTrialingBefore,
          isNowTrialing: previousPlan === 'foundation', // Starting a trial if coming from foundation
        })
      } else {
        const error = await response.json()
        const errorMessage = error.message || 'Failed to upgrade. Please try again.'

        // Track upgrade failed
        analytics.track('plan_upgrade_failed', {
          currentPlan: planTier,
          targetPlan,
          errorMessage,
        })

        alert(errorMessage)
      }
    } catch (error) {
      console.error('Upgrade failed:', error)

      // Track upgrade failed
      analytics.track('plan_upgrade_failed', {
        currentPlan: planTier,
        targetPlan,
        errorMessage: 'Network error or unexpected failure',
      })

      alert('Failed to upgrade. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
          </CardTitle>
          <CardDescription>
            {isTrialing && trialDaysRemaining !== null
              ? `Your trial ends in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}`
              : 'Your active subscription plan'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{currentPlanData?.name || 'Foundation'}</h3>
              <p className="text-muted-foreground">
                {currentPlanData?.description || 'Free plan with basic features'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                ${currentPlanData?.annualPrice || 0}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </p>
              {(currentPlanData?.annualPrice || 0) > 0 && (
                <p className="text-sm text-muted-foreground">billed annually</p>
              )}
            </div>
          </div>

          {status === 'EXPIRED' && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Your trial has expired. Upgrade to continue using premium features.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Success Message */}
      {upgradeSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Plan upgraded successfully!</p>
              <p className="text-sm text-green-600">
                {isTrialing
                  ? 'Your trial has been upgraded. Enjoy your new features!'
                  : 'You now have access to all the features in your new plan.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {planTier === 'exit-ready' ? 'Your Plan' : 'Upgrade Your Plan'}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === planTier
            const isDowngrade =
              (planTier === 'exit-ready' && plan.id !== 'exit-ready') ||
              (planTier === 'growth' && plan.id === 'foundation')
            const canUpgrade = !isCurrentPlan && !isDowngrade
            const canDowngrade = isDowngrade && !isCurrentPlan

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
                    <span className="text-3xl font-bold">${plan.annualPrice}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
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
                        'Upgrading...'
                      ) : isTrialing ? (
                        <>
                          Upgrade Trial
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      ) : planTier === 'foundation' ? (
                        <>
                          Start Free Trial
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
                  ) : canDowngrade ? (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isUpgrading}
                    >
                      {isUpgrading && selectedPlan === plan.id ? (
                        'Processing...'
                      ) : (
                        'Downgrade'
                      )}
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

      {/* Payment Method (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>
            Manage your payment information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
            <div className="text-muted-foreground">
              <p className="font-medium">No payment method on file</p>
              <p className="text-sm">Add a payment method to continue after your trial ends</p>
            </div>
            <Button variant="outline" disabled>
              Add Payment Method
              <span className="ml-2 text-xs text-muted-foreground">(Coming Soon)</span>
            </Button>
          </div>
        </CardContent>
      </Card>

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
