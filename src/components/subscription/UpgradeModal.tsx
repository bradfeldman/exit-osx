'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { getPlan, getRequiredPlan } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { Check, Sparkles, Lock, ArrowRight, Clock } from 'lucide-react'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature?: string
  featureDisplayName?: string
}

export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  featureDisplayName,
}: UpgradeModalProps) {
  const { planTier, isTrialing, trialDaysRemaining, status: _status } = useSubscription()

  // Analytics tracking
  const modalOpenTime = useRef<number>(0)
  const hasTrackedDisplay = useRef(false)

  // Track modal display
  useEffect(() => {
    if (open && !hasTrackedDisplay.current) {
      hasTrackedDisplay.current = true
      modalOpenTime.current = Date.now()

      analytics.track('upgrade_modal_displayed', {
        triggerFeature: feature || 'general',
        currentTier: planTier,
      })
    }

    // Reset tracking when modal closes
    if (!open) {
      hasTrackedDisplay.current = false
    }
  }, [open, feature, planTier])

  // Track modal dismiss (Maybe Later button)
  const handleDismiss = () => {
    const timeDisplayed = Date.now() - modalOpenTime.current

    analytics.track('upgrade_modal_dismissed', {
      triggerFeature: feature || 'general',
      timeDisplayed,
    })

    onOpenChange(false)
  }

  // Track upgrade CTA click
  const handleUpgradeClick = () => {
    analytics.track('upgrade_modal_clicked', {
      selectedPlan: targetPlan,
      triggerFeature: feature || 'general',
    })
  }

  const requiredPlan = feature ? getRequiredPlan(feature) : 'growth'
  const requiredPlanData = getPlan(requiredPlan)
  const currentPlanData = getPlan(planTier)

  const isFoundation = planTier === 'foundation'
  const _isGrowth = planTier === 'growth'

  // Determine which plan to suggest based on current plan and required feature
  // If user needs Exit-Ready feature, suggest Exit-Ready
  // If user is on Foundation and needs Growth feature, suggest Growth
  const targetPlan = requiredPlan === 'exit-ready' ? 'exit-ready' : (isFoundation ? 'growth' : 'exit-ready')
  const targetPlanData = getPlan(targetPlan)

  // Determine the right CTA text based on user's current state
  const getCtaText = () => {
    if (isFoundation) {
      // Foundation user - they need to start a trial
      return `Start Free Trial of ${targetPlanData?.name}`
    }

    if (isTrialing) {
      // User is on a trial (Growth or Exit-Ready) - upgrade their trial
      return `Upgrade Trial to ${targetPlanData?.name}`
    }

    // User is on a paid plan - straight upgrade
    return `Upgrade to ${targetPlanData?.name}`
  }

  // Get the description for the upgrade action
  const getUpgradeDescription = () => {
    if (isFoundation) {
      return 'Start a 7-day free trial with full access to all features.'
    }

    if (isTrialing && trialDaysRemaining !== null) {
      return `Your trial will continue with ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining.`
    }

    return 'Unlock additional features instantly.'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {featureDisplayName
              ? `Unlock ${featureDisplayName}`
              : 'Upgrade to Unlock'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {feature && requiredPlanData ? (
              <>
                This feature requires the{' '}
                <span className="font-semibold text-foreground">
                  {requiredPlanData.name}
                </span>{' '}
                plan or higher.
              </>
            ) : (
              'Unlock more powerful features to accelerate your exit journey.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Plan */}
          <div className="flex items-center justify-between rounded-lg border border-muted bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">Current Plan</p>
              <p className="text-sm text-muted-foreground">
                {currentPlanData?.name || 'Foundation'}
                {isTrialing && trialDaysRemaining !== null && (
                  <span className="ml-2 text-xs text-amber-600">
                    ({trialDaysRemaining} days left in trial)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Target Plan */}
          {targetPlanData && (
            <div className="relative rounded-lg border-2 border-primary bg-primary/5 p-4">
              <div className="absolute -top-3 left-4 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5">
                <Sparkles className="h-3 w-3 text-primary-foreground" />
                <span className="text-xs font-medium text-primary-foreground">
                  {requiredPlan === targetPlan ? 'Required' : 'Recommended'}
                </span>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-semibold">{targetPlanData.name}</h3>
                  <div className="text-right">
                    <span className="text-2xl font-bold">
                      ${targetPlanData.annualPrice}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                    <p className="text-xs text-muted-foreground">
                      billed annually
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {targetPlanData.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {targetPlanData.features
                    .filter(f => f.included)
                    .slice(0, 5)
                    .map(f => (
                      <li key={f.name} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>
                          {f.name}
                          {f.limit && (
                            <span className="text-muted-foreground">
                              {' '}
                              ({f.limit})
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}

          {/* Trial continuation notice for users upgrading during trial */}
          {isTrialing && trialDaysRemaining !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                Your trial continues with {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining.
                No extra time added.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild className="w-full" onClick={handleUpgradeClick}>
            <Link href={`/dashboard/settings?tab=billing&upgrade=${targetPlan}`}>
              {getCtaText()}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            {getUpgradeDescription()}
          </p>
          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
