export type PlanTier = 'starter' | 'professional' | 'enterprise'

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
    id: 'starter',
    name: 'Starter',
    description: 'Get started with basic exit planning insights',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Start Free',
    features: [
      { name: 'Initial Assessment', included: true },
      { name: 'Basic Valuation Estimate', included: true },
      { name: 'Buyer Readiness Score', included: true, limit: 'Overview only' },
      { name: 'Company Assessment', included: false },
      { name: 'Risk Assessment', included: false },
      { name: 'Personal Readiness Assessment', included: false },
      { name: 'Value Improvement Playbook', included: false },
      { name: 'Data Room', included: false },
      { name: 'Financial Analysis Tools', included: false },
      { name: 'DCF Analysis', included: false },
      { name: 'Team Members', included: false },
      { name: 'Multiple Companies', included: false },
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Complete exit planning toolkit for business owners',
    monthlyPrice: 149,
    annualPrice: 119, // ~20% discount
    cta: 'Start 14-Day Trial',
    highlighted: true,
    features: [
      { name: 'Initial Assessment', included: true },
      { name: 'Basic Valuation Estimate', included: true },
      { name: 'Buyer Readiness Score', included: true, limit: 'Full breakdown' },
      { name: 'Company Assessment', included: true },
      { name: 'Risk Assessment', included: true },
      { name: 'Personal Readiness Assessment', included: true },
      { name: 'Value Improvement Playbook', included: true },
      { name: 'Data Room', included: false },
      { name: 'Financial Analysis Tools', included: true, limit: 'P&L, Balance Sheet' },
      { name: 'DCF Analysis', included: false },
      { name: 'Team Members', included: true, limit: 'Up to 3' },
      { name: 'Multiple Companies', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced tools for M&A-ready businesses',
    monthlyPrice: 399,
    annualPrice: 319, // ~20% discount
    cta: 'Start 14-Day Trial',
    features: [
      { name: 'Initial Assessment', included: true },
      { name: 'Basic Valuation Estimate', included: true },
      { name: 'Buyer Readiness Score', included: true, limit: 'Full breakdown + trends' },
      { name: 'Company Assessment', included: true },
      { name: 'Risk Assessment', included: true },
      { name: 'Personal Readiness Assessment', included: true },
      { name: 'Value Improvement Playbook', included: true },
      { name: 'Data Room', included: true },
      { name: 'Financial Analysis Tools', included: true, limit: 'Full suite + Add-backs' },
      { name: 'DCF Analysis', included: true },
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
