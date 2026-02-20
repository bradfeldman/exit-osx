'use client'

import { useState, useCallback, useSyncExternalStore, useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Clock, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { analytics } from '@/lib/analytics'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'trial-banner-dismissed'
const DISMISS_DURATION = 24 * 60 * 60 * 1000 // 24 hours

// Use useSyncExternalStore to safely read localStorage
function useDismissedState() {
  const subscribe = useCallback((callback: () => void) => {
    window.addEventListener('storage', callback)
    return () => window.removeEventListener('storage', callback)
  }, [])

  const getSnapshot = useCallback(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (!dismissedAt) return false
    const dismissedTime = parseInt(dismissedAt, 10)
    const elapsed = Date.now() - dismissedTime
    return elapsed < DISMISS_DURATION
  }, [])

  const getServerSnapshot = useCallback(() => true, []) // Assume dismissed on server

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function TrialBanner() {
  const { isTrialing, trialDaysRemaining, status, isLoading } = useSubscription()
  const wasDismissed = useDismissedState()
  const [manuallyDismissed, setManuallyDismissed] = useState(false)
  const hasTrackedDisplay = useRef(false)

  const isDismissed = wasDismissed || manuallyDismissed

  // Show for all trial users so they always know their trial status
  const shouldShowTrialBanner = isTrialing && trialDaysRemaining !== null

  // Show for expired trials
  const showExpiredBanner = status === 'EXPIRED'

  const isUrgent = trialDaysRemaining !== null && trialDaysRemaining <= 3
  const isEndingSoon = trialDaysRemaining !== null && trialDaysRemaining <= 7
  const shouldShow = !isLoading && !isDismissed && (shouldShowTrialBanner || showExpiredBanner)

  // Track banner display
  useEffect(() => {
    if (!shouldShow || hasTrackedDisplay.current) return
    hasTrackedDisplay.current = true

    analytics.track('trial_banner_displayed', {
      daysRemaining: trialDaysRemaining,
      isExpired: showExpiredBanner,
      isUrgent,
    })
  }, [shouldShow, trialDaysRemaining, showExpiredBanner, isUrgent])

  const handleDismiss = () => {
    analytics.track('trial_banner_dismissed', {
      daysRemaining: trialDaysRemaining,
    })

    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setManuallyDismissed(true)
  }

  const handleUpgradeClick = () => {
    analytics.track('trial_banner_clicked', {
      daysRemaining: trialDaysRemaining,
      isExpired: showExpiredBanner,
      destination: '/dashboard/settings?tab=billing',
    })
  }

  // Don't show if loading, dismissed, or not trialing/expired
  if (!shouldShow) {
    return null
  }

  return (
    <div
      className={cn(
        'relative z-50 px-4 py-3',
        showExpiredBanner
          ? 'bg-destructive/10 border-b border-destructive/20'
          : isUrgent
          ? 'bg-orange/10 border-b border-orange/20'
          : isEndingSoon
          ? 'bg-primary/10 border-b border-primary/20'
          : 'bg-muted/50 border-b border-border/50'
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full',
              showExpiredBanner
                ? 'bg-destructive/10'
                : isUrgent
                ? 'bg-orange/10'
                : isEndingSoon
                ? 'bg-primary/10'
                : 'bg-muted'
            )}
          >
            {showExpiredBanner ? (
              <Clock className="h-4 w-4 text-destructive" />
            ) : (
              <Sparkles
                className={cn(
                  'h-4 w-4',
                  isUrgent ? 'text-orange-dark' : isEndingSoon ? 'text-primary' : 'text-muted-foreground'
                )}
              />
            )}
          </div>
          <div>
            {showExpiredBanner ? (
              <>
                <p className="text-sm font-medium text-destructive">
                  Your trial has expired
                </p>
                <p className="text-xs text-muted-foreground">
                  Upgrade now to continue using premium features
                </p>
              </>
            ) : (
              <>
                <p
                  className={cn(
                    'text-sm font-medium',
                    isUrgent ? 'text-orange-dark dark:text-orange' : 'text-foreground'
                  )}
                >
                  {trialDaysRemaining === 0
                    ? 'Your trial ends today'
                    : trialDaysRemaining === 1
                    ? '1 day left in your trial'
                    : `${trialDaysRemaining} days left in your trial`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isUrgent
                    ? 'After your trial, you\'ll lose access to premium features and revert to the free Foundation plan.'
                    : isEndingSoon
                    ? 'Upgrade to keep all your premium features when your trial ends.'
                    : 'You have full access to all premium features. Upgrade anytime to keep them.'}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant={showExpiredBanner || isUrgent ? 'default' : 'outline'}
            onClick={handleUpgradeClick}
          >
            <Link href="/dashboard/settings?tab=billing">
              Upgrade Now
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
          {!showExpiredBanner && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
