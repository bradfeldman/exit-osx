'use client'

import { ReactNode } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { LockedFeature } from './LockedFeature'
import { RequestAccessFeature } from './RequestAccessFeature'

interface FeatureGateProps {
  feature: string
  featureDisplayName?: string
  children: ReactNode
  fallback?: ReactNode
  showLockedState?: boolean
  /** Custom component to show when staff should request access instead of upgrade */
  requestAccessFallback?: ReactNode
}

/**
 * FeatureGate - Conditionally renders content based on subscription tier
 *
 * @param feature - The feature key to check access for (from FEATURE_REQUIREMENTS)
 * @param featureDisplayName - Human-readable name for the feature
 * @param children - Content to render if user has access
 * @param fallback - Custom fallback to render if user lacks access (overrides default locked state)
 * @param showLockedState - Whether to show the locked state UI (default: true)
 * @param requestAccessFallback - Custom component for staff who should request access
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
  requestAccessFallback,
}: FeatureGateProps) {
  const { canAccessFeature, shouldShowRequestAccess, isLoading } = useSubscription()

  // While loading, render nothing to avoid flashing
  if (isLoading) {
    return null
  }

  // Check if user has access to this feature
  if (canAccessFeature(feature)) {
    return <>{children}</>
  }

  // User doesn't have access - check if they should request access (staff on personal features)
  if (shouldShowRequestAccess(feature)) {
    if (requestAccessFallback) {
      return <>{requestAccessFallback}</>
    }
    if (showLockedState) {
      return (
        <RequestAccessFeature
          feature={feature}
          featureDisplayName={featureDisplayName}
        />
      )
    }
    return null
  }

  // User should upgrade - show fallback or locked state
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
  const { canAccessFeature, getUpgradeReason, shouldShowRequestAccess, isLoading } = useSubscription()

  return {
    hasAccess: canAccessFeature(feature),
    upgradeReason: getUpgradeReason(feature),
    shouldRequestAccess: shouldShowRequestAccess(feature),
    isLoading,
  }
}
