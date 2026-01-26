'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { PlanTier, canAccessFeature, getUpgradeMessage, TEAM_MEMBER_LIMITS } from '@/lib/pricing'

type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'
type BillingCycle = 'MONTHLY' | 'ANNUAL' | null

interface SubscriptionData {
  organizationId: string
  organizationName: string
  planTier: PlanTier
  status: SubscriptionStatus
  billingCycle: BillingCycle
  isTrialing: boolean
  trialStartedAt: string | null
  trialEndsAt: string | null
  trialDaysRemaining: number | null
  teamMemberCount: number
  hasStripeSubscription: boolean
}

interface SubscriptionContextType {
  // Subscription data
  planTier: PlanTier
  status: SubscriptionStatus
  isTrialing: boolean
  trialEndsAt: Date | null
  trialDaysRemaining: number | null
  teamMemberCount: number
  teamMemberLimit: number

  // Loading state
  isLoading: boolean
  error: string | null

  // Feature access helpers
  canAccessFeature: (feature: string) => boolean
  getUpgradeReason: (feature: string) => string | null
  canAddTeamMember: () => boolean

  // Actions
  refetch: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSubscription = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/subscription')
      if (response.ok) {
        const data = await response.json()
        setSubscription(data.subscription)
      } else if (response.status === 401) {
        // User not authenticated - not an error, just no subscription
        setSubscription(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load subscription')
      }
    } catch (err) {
      console.error('Failed to load subscription:', err)
      setError('Failed to load subscription')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // Derive values from subscription data
  const planTier: PlanTier = subscription?.planTier || 'foundation'
  const status: SubscriptionStatus = subscription?.status || 'ACTIVE'
  const isTrialing = subscription?.isTrialing || false
  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const trialDaysRemaining = subscription?.trialDaysRemaining ?? null
  const teamMemberCount = subscription?.teamMemberCount || 1
  const teamMemberLimit = TEAM_MEMBER_LIMITS[planTier]

  // Feature access check using pricing helpers
  const checkFeatureAccess = useCallback((feature: string): boolean => {
    // If subscription is expired or cancelled, only allow foundation features
    if (status === 'EXPIRED' || status === 'CANCELLED') {
      return canAccessFeature('foundation', feature)
    }
    return canAccessFeature(planTier, feature)
  }, [planTier, status])

  // Get upgrade reason if user doesn't have access
  const getUpgradeReason = useCallback((feature: string): string | null => {
    if (checkFeatureAccess(feature)) {
      return null
    }
    return getUpgradeMessage(feature)
  }, [checkFeatureAccess])

  // Check if user can add more team members
  const checkCanAddTeamMember = useCallback((): boolean => {
    if (status === 'EXPIRED' || status === 'CANCELLED') {
      return false
    }
    return teamMemberCount < teamMemberLimit
  }, [status, teamMemberCount, teamMemberLimit])

  return (
    <SubscriptionContext.Provider
      value={{
        planTier,
        status,
        isTrialing,
        trialEndsAt,
        trialDaysRemaining,
        teamMemberCount,
        teamMemberLimit,
        isLoading,
        error,
        canAccessFeature: checkFeatureAccess,
        getUpgradeReason,
        canAddTeamMember: checkCanAddTeamMember,
        refetch: loadSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
