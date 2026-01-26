'use client'

import { ReactNode } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { LockedFeature } from './LockedFeature'

interface FeatureGateProps {
  feature: string
  featureDisplayName?: string
  children: ReactNode
  fallback?: ReactNode
  showLockedState?: boolean
}

/**
 * FeatureGate - Conditionally renders content based on subscription tier
 *
 * @param feature - The feature key to check access for (from FEATURE_REQUIREMENTS)
 * @param featureDisplayName - Human-readable name for the feature
 * @param children - Content to render if user has access
 * @param fallback - Custom fallback to render if user lacks access (overrides default locked state)
 * @param showLockedState - Whether to show the locked state UI (default: true)
 *
 * @example
 * // Basic usage - shows locked state if no access
 * <FeatureGate feature="data-room" featureDisplayName="Data Room">
 *   <DataRoomContent />
 * </FeatureGate>
 *
 * @example
 * // Custom fallback
 * <FeatureGate feature="dcf-valuation" fallback={<BasicValuationFallback />}>
 *   <DCFValuation />
 * </FeatureGate>
 *
 * @example
 * // Hide completely if no access
 * <FeatureGate feature="deal-tracker" showLockedState={false}>
 *   <DealTrackerButton />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  featureDisplayName,
  children,
  fallback,
  showLockedState = true,
}: FeatureGateProps) {
  const { canAccessFeature, isLoading } = useSubscription()

  // While loading, render nothing to avoid flashing
  if (isLoading) {
    return null
  }

  // Check if user has access to this feature
  if (canAccessFeature(feature)) {
    return <>{children}</>
  }

  // User doesn't have access - show fallback or locked state
  if (fallback) {
    return <>{fallback}</>
  }

  if (showLockedState) {
    return (
      <LockedFeature
        feature={feature}
        featureDisplayName={featureDisplayName}
        variant="card"
      />
    )
  }

  // Hide completely
  return null
}

/**
 * Hook version for more complex conditional logic
 */
export function useFeatureAccess(feature: string) {
  const { canAccessFeature, getUpgradeReason, isLoading } = useSubscription()

  return {
    hasAccess: canAccessFeature(feature),
    upgradeReason: getUpgradeReason(feature),
    isLoading,
  }
}
