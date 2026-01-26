'use client'

import { useState, useCallback, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { X, Clock, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSubscription } from '@/contexts/SubscriptionContext'
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

  const isDismissed = wasDismissed || manuallyDismissed

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
    setManuallyDismissed(true)
  }

  // Don't show if loading, dismissed, not trialing, or more than 7 days remaining
  if (isLoading || isDismissed) {
    return null
  }

  // Show for trial users with 7 or fewer days remaining
  const shouldShowTrialBanner = isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 7

  // Show for expired trials
  const showExpiredBanner = status === 'EXPIRED'

  if (!shouldShowTrialBanner && !showExpiredBanner) {
    return null
  }

  const isUrgent = trialDaysRemaining !== null && trialDaysRemaining <= 3

  return (
    <div
      className={cn(
        'relative z-50 px-4 py-3',
        showExpiredBanner
          ? 'bg-destructive/10 border-b border-destructive/20'
          : isUrgent
          ? 'bg-amber-500/10 border-b border-amber-500/20'
          : 'bg-primary/10 border-b border-primary/20'
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
                ? 'bg-amber-500/10'
                : 'bg-primary/10'
            )}
          >
            {showExpiredBanner ? (
              <Clock className="h-4 w-4 text-destructive" />
            ) : (
              <Sparkles
                className={cn(
                  'h-4 w-4',
                  isUrgent ? 'text-amber-600' : 'text-primary'
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
                    isUrgent ? 'text-amber-700 dark:text-amber-500' : 'text-foreground'
                  )}
                >
                  {trialDaysRemaining === 0
                    ? 'Your trial ends today'
                    : trialDaysRemaining === 1
                    ? '1 day left in your trial'
                    : `${trialDaysRemaining} days left in your trial`}
                </p>
                <p className="text-xs text-muted-foreground">
                  Upgrade to keep all your premium features
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
          >
            <Link href="/dashboard/settings/billing">
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
