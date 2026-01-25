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
