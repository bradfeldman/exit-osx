'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { PRICING_PLANS, getPlan, type PlanTier } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, CreditCard, Sparkles, ArrowRight, AlertCircle, ExternalLink } from 'lucide-react'
import styles from './settings.module.css'

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

      analytics.track('plan_upgrade_completed', {
        previousPlan: 'foundation',
        newPlan: planTier,
        wasTrialing: isTrialing,
        isNowTrialing: true,
      })

      // Clean URL without reloading
      const url = new URL(window.location.href)
      url.searchParams.delete('session_id')
      window.history.replaceState({}, '', url.toString())
    }
  }, [checkoutSessionId, refetch, planTier, isTrialing])

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
      <div className={styles.loadingCenter}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.billingPage}>
      {/* Checkout Success Message */}
      {checkoutSuccess && (
        <div className={styles.checkoutSuccess}>
          <div className={styles.checkoutSuccessIcon}>
            <Check size={20} />
          </div>
          <div className={styles.checkoutSuccessText}>
            <strong>Subscription activated!</strong>
            <span>
              Welcome to {currentPlanData?.name}. You now have full access to all plan features.
            </span>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            Current Plan
            {isTrialing && (
              <span className={styles.trialBadge}>
                <Clock size={12} />
                Trial
              </span>
            )}
            {status === 'PAST_DUE' && (
              <span className={styles.pastDueBadge}>
                <AlertCircle size={12} />
                Past Due
              </span>
            )}
          </h2>
          <p className={styles.cardDescription}>
            {isTrialing && trialDaysRemaining !== null
              ? `Your trial ends in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}`
              : status === 'PAST_DUE'
              ? 'Please update your payment method to continue service'
              : 'Your active subscription plan'}
          </p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.currentPlanRow}>
            <div>
              <h3 className={styles.currentPlanName}>{currentPlanData?.name || 'Foundation'}</h3>
              <p className={styles.currentPlanDesc}>
                {currentPlanData?.description || 'Free plan with basic features'}
              </p>
            </div>
            <div>
              <p className={styles.currentPlanPrice}>
                ${billingCycle === 'annual' ? (currentPlanData?.annualPrice || 0) : (currentPlanData?.monthlyPrice || 0)}
                <span>/mo</span>
              </p>
              {(currentPlanData?.annualPrice || 0) > 0 && (
                <p className={styles.currentPlanBilling}>
                  billed {billingCycle === 'annual' ? 'annually' : 'monthly'}
                </p>
              )}
            </div>
          </div>

          {status === 'EXPIRED' && (
            <div className={styles.expiredBanner}>
              <AlertCircle size={18} />
              <span>Your trial has expired. Upgrade to continue using premium features.</span>
            </div>
          )}

          {/* Manage Billing button — only shown if user has a Stripe subscription */}
          {hasStripeSubscription && planTier !== 'foundation' && (
            <div style={{ marginTop: 16 }}>
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
        </div>
      </div>

      {/* Available Plans */}
      <div>
        <div className={styles.planSectionHeader}>
          <h2 className={styles.planSectionTitle}>
            {planTier === 'deal-room' ? 'Your Plan' : 'Upgrade Your Plan'}
          </h2>

          {/* Billing Cycle Toggle */}
          <div className={styles.billingToggle}>
            <span className={`${styles.billingToggleLabel}${billingCycle === 'monthly' ? ` ${styles.billingToggleLabelActive}` : ''}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className={`${styles.toggleTrack}${billingCycle === 'annual' ? ` ${styles.toggleTrackActive}` : ''}`}
            >
              <span
                className={`${styles.toggleThumb}${billingCycle === 'annual' ? ` ${styles.toggleThumbActive}` : ''}`}
              />
            </button>
            <span className={`${styles.billingToggleLabel}${billingCycle === 'annual' ? ` ${styles.billingToggleLabelActive}` : ''}`}>
              Annual
              <span className={styles.saveBadge}>Save 20%</span>
            </span>
          </div>
        </div>

        <div className={styles.planGrid}>
          {PRICING_PLANS.map((plan) => {
            const isCurrentPlan = plan.id === planTier
            const isDowngrade =
              (planTier === 'deal-room' && plan.id !== 'deal-room') ||
              (planTier === 'growth' && plan.id === 'foundation')
            const canUpgrade = !isCurrentPlan && !isDowngrade
            const price = billingCycle === 'annual' ? plan.annualPrice : plan.monthlyPrice

            const planCardClass = [
              styles.planCard,
              isCurrentPlan ? styles.planCardCurrent : '',
              plan.highlighted && !isCurrentPlan ? styles.planCardHighlighted : '',
              selectedPlan === plan.id ? styles.planCardSelected : '',
            ].filter(Boolean).join(' ')

            return (
              <div key={plan.id} className={planCardClass}>
                {plan.highlighted && !isCurrentPlan && (
                  <div className={styles.planBadge}>
                    <Badge className="bg-primary">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isCurrentPlan && (
                  <div className={styles.planBadge}>
                    <Badge variant="secondary">Current Plan</Badge>
                  </div>
                )}
                <div className={styles.planCardHeader}>
                  <p className={styles.planName}>{plan.name}</p>
                  <div className={styles.planPrice}>
                    <strong>${price}</strong>
                    <span>/mo</span>
                  </div>
                  {price > 0 && billingCycle === 'annual' && (
                    <p className={styles.planAnnualNote}>
                      billed annually at ${(price * 12).toLocaleString()}/yr
                    </p>
                  )}
                </div>
                <div className={styles.planCardBody}>
                  <p className={styles.planDescription}>{plan.description}</p>
                  <ul className={styles.featureList}>
                    {plan.features.slice(0, 5).map((feature) => (
                      <li
                        key={feature.name}
                        className={`${styles.featureItem}${!feature.included ? ` ${styles.featureItemDisabled}` : ''}`}
                      >
                        <Check
                          className={`${styles.featureCheck} ${feature.included ? styles.featureCheckEnabled : styles.featureCheckDisabled}`}
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
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trial Notice */}
      {isTrialing && (
        <p className={styles.trialNote}>
          You won&apos;t be charged until your trial ends.{' '}
          {trialDaysRemaining !== null && `${trialDaysRemaining} days remaining.`}
        </p>
      )}
    </div>
  )
}
