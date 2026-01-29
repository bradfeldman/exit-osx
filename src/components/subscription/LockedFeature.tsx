'use client'

import { useState, useEffect, useRef } from 'react'
import { Lock, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UpgradeModal } from './UpgradeModal'
import { getRequiredPlan, getPlan } from '@/lib/pricing'
import { analytics } from '@/lib/analytics'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { cn } from '@/lib/utils'

interface LockedFeatureProps {
  feature: string
  featureDisplayName?: string
  className?: string
  variant?: 'card' | 'inline' | 'minimal'
}

export function LockedFeature({
  feature,
  featureDisplayName,
  className,
  variant = 'card',
}: LockedFeatureProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const { planTier } = useSubscription()
  const hasTrackedDisplay = useRef(false)

  const requiredPlan = getRequiredPlan(feature)
  const planData = getPlan(requiredPlan)

  // Track when locked feature is displayed
  useEffect(() => {
    if (hasTrackedDisplay.current) return
    hasTrackedDisplay.current = true

    analytics.track('feature_locked_displayed', {
      featureName: feature,
      requiredTier: requiredPlan,
      currentTier: planTier,
    })
  }, [feature, requiredPlan, planTier])

  // Track unlock button click
  const handleUnlockClick = () => {
    setShowUpgradeModal(true)
  }

  if (variant === 'minimal') {
    return (
      <>
        <button
          onClick={handleUnlockClick}
          className={cn(
            'flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors',
            className
          )}
        >
          <Lock className="h-3.5 w-3.5" />
          <span className="text-sm">Locked</span>
        </button>
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature={feature}
          featureDisplayName={featureDisplayName}
        />
      </>
    )
  }

  if (variant === 'inline') {
    return (
      <>
        <button
          onClick={handleUnlockClick}
          className={cn(
            'inline-flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground transition-colors',
            className
          )}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>{featureDisplayName || 'Feature'}</span>
          <span className="text-xs">({planData?.name} plan)</span>
        </button>
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature={feature}
          featureDisplayName={featureDisplayName}
        />
      </>
    )
  }

  // Card variant (default)
  return (
    <>
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center',
          className
        )}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">
          {featureDisplayName || 'Premium Feature'}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Upgrade to {planData?.name || 'a higher plan'} to unlock this feature.
        </p>
        <Button onClick={handleUnlockClick}>
          Unlock Feature
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={feature}
        featureDisplayName={featureDisplayName}
      />
    </>
  )
}
