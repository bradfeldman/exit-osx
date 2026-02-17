export type PlanTier = 'foundation' | 'growth' | 'exit-ready'

export interface PlanFeature {
  name: string
  included: boolean
  limit?: string
}

export interface PricingPlan {
  id: PlanTier
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number // per month when billed annually
  features: PlanFeature[]
  cta: string
  highlighted?: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'foundation',
    name: 'Foundation',
    description: 'Start your exit journey with essential insights',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Get Started Free',
    features: [
      { name: 'Exit Readiness Assessment', included: true },
      { name: 'Valuation Estimate', included: true },
      { name: 'Buyer Readiness Index', included: true, limit: 'Overview only' },
      { name: 'Full Risk Diagnostic', included: false },
      { name: 'Personal Readiness Check', included: false },
      { name: 'Value Improvement Action Plan', included: false },
      { name: 'Personal Financial Clarity', included: false },
      { name: 'Retirement Readiness Model', included: false },
      { name: 'Lending Partner Network', included: false },
      { name: 'Buyer-Ready Data Room', included: false },
      { name: 'Financial Health Diagnostic', included: false },
      { name: 'Automated Financial Sync', included: false },
      { name: 'Discounted Cash Flow Analysis', included: false },
      { name: 'Deal Pipeline Manager', included: false },
      { name: 'Team Access', included: false },
      { name: 'Multi-Company Portfolio', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Comprehensive tools to actively increase your business value',
    monthlyPrice: 179,
    annualPrice: 149,
    cta: 'Start 7-Day Free Trial',
    highlighted: true,
    features: [
      { name: 'Exit Readiness Assessment', included: true },
      { name: 'Valuation Estimate', included: true },
      { name: 'Buyer Readiness Index', included: true, limit: 'Full breakdown' },
      { name: 'AI Exit Coach', included: true },
      { name: 'Full Risk Diagnostic', included: true },
      { name: 'Personal Readiness Check', included: true },
      { name: 'Value Improvement Action Plan', included: true },
      { name: 'Personal Financial Clarity', included: true },
      { name: 'Retirement Readiness Model', included: true },
      { name: 'Lending Partner Network', included: true, limit: 'Partner network access' },
      { name: 'Buyer-Ready Data Room', included: false },
      { name: 'Financial Health Diagnostic', included: true, limit: 'P&L, Balance Sheet, Add-backs' },
      { name: 'Automated Financial Sync', included: true },
      { name: 'Discounted Cash Flow Analysis', included: true },
      { name: 'Deal Pipeline Manager', included: false },
      { name: 'Team Access', included: true, limit: 'Up to 3' },
      { name: 'Multi-Company Portfolio', included: false },
    ],
  },
  {
    id: 'exit-ready',
    name: 'Exit-Ready',
    description: 'Full suite for M&A-ready businesses preparing to exit',
    monthlyPrice: 449,
    annualPrice: 379,
    cta: 'Start 7-Day Free Trial',
    features: [
      { name: 'Exit Readiness Assessment', included: true },
      { name: 'Valuation Estimate', included: true },
      { name: 'Buyer Readiness Index', included: true, limit: 'Full breakdown + trends' },
      { name: 'Full Risk Diagnostic', included: true },
      { name: 'Personal Readiness Check', included: true },
      { name: 'Value Improvement Action Plan', included: true },
      { name: 'Personal Financial Clarity', included: true },
      { name: 'Retirement Readiness Model', included: true },
      { name: 'Lending Partner Network', included: true, limit: 'Priority access + support' },
      { name: 'Buyer-Ready Data Room', included: true },
      { name: 'Financial Health Diagnostic', included: true, limit: 'Full suite + Add-backs' },
      { name: 'Automated Financial Sync', included: true },
      { name: 'Discounted Cash Flow Analysis', included: true },
      { name: 'Deal Pipeline Manager', included: true },
      { name: 'Team Access', included: true, limit: 'Unlimited' },
      { name: 'Multi-Company Portfolio', included: true },
    ],
  },
]

// Feature access helper for future use
export function hasFeatureAccess(tier: PlanTier, featureName: string): boolean {
  const plan = PRICING_PLANS.find(p => p.id === tier)
  if (!plan) return false

  const feature = plan.features.find(f => f.name === featureName)
  return feature?.included ?? false
}

// Get plan by ID
export function getPlan(tier: PlanTier): PricingPlan | undefined {
  return PRICING_PLANS.find(p => p.id === tier)
}

// Map features to minimum required plan
export const FEATURE_REQUIREMENTS: Record<string, PlanTier> = {
  // Foundation (free)
  'initial-assessment': 'foundation',
  'basic-valuation': 'foundation',
  'bri-overview': 'foundation',

  // Growth required
  'ai-coach': 'growth',
  'company-assessment': 'growth',
  'risk-assessment': 'growth',
  'personal-assessment': 'growth',
  'action-plan': 'growth',
  'personal-financials': 'growth',
  'retirement-calculator': 'growth',
  'business-loans': 'growth',
  'business-financials': 'growth',
  'quickbooks': 'growth',
  'team-members': 'growth', // limit: 3

  // Exit-Ready required
  'data-room': 'exit-ready',
  'dcf-valuation': 'growth',
  'deal-tracker': 'exit-ready',
  'unlimited-team': 'exit-ready',
  'multiple-companies': 'exit-ready',
}

// Plan hierarchy for comparison
const PLAN_HIERARCHY: PlanTier[] = ['foundation', 'growth', 'exit-ready']

/**
 * Get the minimum required plan for a feature
 */
export function getRequiredPlan(feature: string): PlanTier {
  return FEATURE_REQUIREMENTS[feature] || 'foundation'
}

/**
 * Check if a user's plan meets the requirement for a feature
 */
export function planMeetsRequirement(userPlan: PlanTier, requiredPlan: PlanTier): boolean {
  return PLAN_HIERARCHY.indexOf(userPlan) >= PLAN_HIERARCHY.indexOf(requiredPlan)
}

/**
 * Check if a user can access a specific feature
 */
export function canAccessFeature(userPlan: PlanTier, feature: string): boolean {
  const requiredPlan = getRequiredPlan(feature)
  return planMeetsRequirement(userPlan, requiredPlan)
}

/**
 * Get upgrade message for a locked feature
 */
export function getUpgradeMessage(feature: string): string {
  const requiredPlan = getRequiredPlan(feature)
  const plan = getPlan(requiredPlan)
  return plan ? `Upgrade to ${plan.name} to unlock this feature` : 'Upgrade to unlock this feature'
}

/**
 * Company limits by plan tier
 * Foundation and Growth: 1 company
 * Exit-Ready: up to 3 companies
 */
export const COMPANY_LIMITS: Record<PlanTier, number> = {
  'foundation': 1,
  'growth': 1,
  'exit-ready': 3,
} as const

/**
 * Team member limits by plan
 */
export const TEAM_MEMBER_LIMITS: Record<PlanTier, number> = {
  'foundation': 1,
  'growth': 3,
  'exit-ready': Infinity,
}

/**
 * Check if user can add more team members
 */
export function canAddTeamMember(userPlan: PlanTier, currentCount: number): boolean {
  const limit = TEAM_MEMBER_LIMITS[userPlan]
  return currentCount < limit
}

/**
 * Personal features that require owner status or explicit grant
 * These features are tied to the individual, not just company access
 */
export const PERSONAL_FEATURES = ['personal-financials', 'retirement-calculator', 'business-loans'] as const
export type PersonalFeature = typeof PERSONAL_FEATURES[number]

/**
 * Check if a feature is a personal feature
 * Personal features require owner status or explicit staff grant
 */
export function isPersonalFeature(feature: string): feature is PersonalFeature {
  return PERSONAL_FEATURES.includes(feature as PersonalFeature)
}

/**
 * Get list of all personal feature keys
 */
export function getPersonalFeatures(): readonly string[] {
  return PERSONAL_FEATURES
}
