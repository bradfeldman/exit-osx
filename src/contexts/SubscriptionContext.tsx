'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { PlanTier, canAccessFeature, getUpgradeMessage, TEAM_MEMBER_LIMITS, isPersonalFeature } from '@/lib/pricing'
import { useCompany } from './CompanyContext'

type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED'
type BillingCycle = 'MONTHLY' | 'ANNUAL' | null
type UserRole = 'subscribing_owner' | 'owner' | 'staff'

interface StaffAccessGrants {
  hasPFSAccess: boolean
  hasRetirementAccess: boolean
  hasLoansAccess: boolean
}

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
  // New company-based access fields
  userRole?: UserRole
  staffAccess?: StaffAccessGrants
  isComped?: boolean
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

  // Company-based access
  userRole: UserRole | null
  isOwner: boolean
  isSubscribingOwner: boolean
  isStaff: boolean
  isComped: boolean
  staffAccess: StaffAccessGrants | null

  // Loading state
  isLoading: boolean
  error: string | null

  // Feature access helpers
  canAccessFeature: (feature: string) => boolean
  canAccessCompanyFeature: (feature: string) => boolean
  canAccessPersonalFeature: (feature: string) => boolean
  getUpgradeReason: (feature: string) => string | null
  canAddTeamMember: () => boolean
  shouldShowRequestAccess: (feature: string) => boolean

  // Actions
  refetch: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { selectedCompanyId } = useCompany()

  const loadSubscription = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Include company ID in request for company-based access check
      const url = selectedCompanyId
        ? `/api/subscription?companyId=${selectedCompanyId}`
        : '/api/subscription'
      const response = await fetch(url)
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
  }, [selectedCompanyId])

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

  // Company-based access
  const userRole = subscription?.userRole || null
  const isOwner = userRole === 'subscribing_owner' || userRole === 'owner'
  const isSubscribingOwner = userRole === 'subscribing_owner'
  const isStaff = userRole === 'staff'
  const isComped = subscription?.isComped || false
  const staffAccess = subscription?.staffAccess || null

  // Check company feature access (based on subscribing owner's plan)
  const checkCompanyFeatureAccess = useCallback((feature: string): boolean => {
    // COMPED users always have Exit-Ready access
    if (isComped) {
      return true
    }
    // If subscription is expired or cancelled, only allow foundation features
    if (status === 'EXPIRED' || status === 'CANCELLED') {
      return canAccessFeature('foundation', feature)
    }
    return canAccessFeature(planTier, feature)
  }, [planTier, status, isComped])

  // Check personal feature access (owner or granted staff)
  const checkPersonalFeatureAccess = useCallback((feature: string): boolean => {
    // COMPED users always have access
    if (isComped) {
      return true
    }

    // First check if plan supports this feature
    if (!checkCompanyFeatureAccess(feature)) {
      return false
    }

    // If no company is selected (userRole is null), treat user as owner of their org
    // This allows users without a company yet to see features as unlocked
    if (userRole === null) {
      return true
    }

    // Owners always have access to personal features
    if (isOwner) {
      return true
    }

    // Staff need explicit grants for personal features
    if (isStaff && staffAccess) {
      if (feature === 'personal-financials') {
        return staffAccess.hasPFSAccess
      }
      if (feature === 'retirement-calculator') {
        return staffAccess.hasRetirementAccess
      }
      if (feature === 'business-loans') {
        return staffAccess.hasLoansAccess
      }
    }

    return false
  }, [checkCompanyFeatureAccess, isOwner, isStaff, staffAccess, isComped, userRole])

  // Combined feature access check
  const checkFeatureAccess = useCallback((feature: string): boolean => {
    if (isPersonalFeature(feature)) {
      return checkPersonalFeatureAccess(feature)
    }
    return checkCompanyFeatureAccess(feature)
  }, [checkCompanyFeatureAccess, checkPersonalFeatureAccess])

  // Check if staff should see "Request Access" instead of "Upgrade"
  const checkShouldShowRequestAccess = useCallback((feature: string): boolean => {
    // Only for staff members on personal features
    if (!isStaff || !isPersonalFeature(feature)) {
      return false
    }
    // Only if the company's plan supports the feature
    if (!checkCompanyFeatureAccess(feature)) {
      return false
    }
    // Only if they don't already have access
    return !checkPersonalFeatureAccess(feature)
  }, [isStaff, checkCompanyFeatureAccess, checkPersonalFeatureAccess])

  // Get upgrade reason if user doesn't have access
  const getUpgradeReasonCallback = useCallback((feature: string): string | null => {
    if (checkFeatureAccess(feature)) {
      return null
    }
    if (checkShouldShowRequestAccess(feature)) {
      return 'Request access from your company owner'
    }
    return getUpgradeMessage(feature)
  }, [checkFeatureAccess, checkShouldShowRequestAccess])

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
        userRole,
        isOwner,
        isSubscribingOwner,
        isStaff,
        isComped,
        staffAccess,
        isLoading,
        error,
        canAccessFeature: checkFeatureAccess,
        canAccessCompanyFeature: checkCompanyFeatureAccess,
        canAccessPersonalFeature: checkPersonalFeatureAccess,
        getUpgradeReason: getUpgradeReasonCallback,
        canAddTeamMember: checkCanAddTeamMember,
        shouldShowRequestAccess: checkShouldShowRequestAccess,
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
