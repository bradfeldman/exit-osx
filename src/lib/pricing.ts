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
      { name: 'Initial Assessment', included: true },
      { name: 'Basic Valuation Estimate', included: true },
      { name: 'Buyer Readiness Score', included: true, limit: 'Overview only' },
      { name: 'Company Assessment', included: false },
      { name: 'Risk Assessment', included: false },
      { name: 'Personal Readiness Assessment', included: false },
      { name: 'Value Improvement Playbook', included: false },
      { name: 'Personal Financial Statements', included: false },
      { name: 'Retirement Calculator', included: false },
      { name: 'Business Loans', included: false },
      { name: 'Data Room', included: false },
      { name: 'Financial Analysis Tools', included: false },
      { name: 'QuickBooks Integration', included: false },
      { name: 'DCF Analysis', included: false },
      { name: 'Deal Tracker', included: false },
      { name: 'Team Members', included: false },
      { name: 'Multiple Companies', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Comprehensive tools to actively increase your business value',
    monthlyPrice: 179,
    annualPrice: 149,
    cta: 'Start 14-Day Free Trial',
    highlighted: true,
    features: [
      { name: 'Initial Assessment', included: true },
      { name: 'Basic Valuation Estimate', included: true },
      { name: 'Buyer Readiness Score', included: true, limit: 'Full breakdown' },
      { name: 'Company Assessment', included: true },
      { name: 'Risk Assessment', included: true },
      { name: 'Personal Readiness Assessment', included: true },
      { name: 'Value Improvement Playbook', included: true },
      { name: 'Personal Financial Statements', included: true },
      { name: 'Retirement Calculator', included: true },
      { name: 'Business Loans', included: true, limit: 'Partner network access' },
      { name: 'Data Room', included: false },
      { name: 'Financial Analysis Tools', included: true, limit: 'P&L, Balance Sheet' },
      { name: 'QuickBooks Integration', included: true },
      { name: 'DCF Analysis', included: false },
      { name: 'Deal Tracker', included: false },
      { name: 'Team Members', included: true, limit: 'Up to 3' },
      { name: 'Multiple Companies', included: false },
    ],
  },
  {
    id: 'exit-ready',
    name: 'Exit-Ready',
    description: 'Full suite for M&A-ready businesses preparing to exit',
    monthlyPrice: 449,
    annualPrice: 379,
    cta: 'Start 14-Day Free Trial',
    features: [
      { name: 'Initial Assessment', included: true },
      { name: 'Basic Valuation Estimate', included: true },
      { name: 'Buyer Readiness Score', included: true, limit: 'Full breakdown + trends' },
      { name: 'Company Assessment', included: true },
      { name: 'Risk Assessment', included: true },
      { name: 'Personal Readiness Assessment', included: true },
      { name: 'Value Improvement Playbook', included: true },
      { name: 'Personal Financial Statements', included: true },
      { name: 'Retirement Calculator', included: true },
      { name: 'Business Loans', included: true, limit: 'Priority access + support' },
      { name: 'Data Room', included: true },
      { name: 'Financial Analysis Tools', included: true, limit: 'Full suite + Add-backs' },
      { name: 'QuickBooks Integration', included: true },
      { name: 'DCF Analysis', included: true },
      { name: 'Deal Tracker', included: true },
      { name: 'Team Members', included: true, limit: 'Unlimited' },
      { name: 'Multiple Companies', included: true },
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
  'dcf-valuation': 'exit-ready',
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
