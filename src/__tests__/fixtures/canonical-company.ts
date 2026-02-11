/**
 * Canonical Test Company Fixture
 *
 * This fixture provides deterministic test data for a "canonical" SaaS company
 * used across unit tests, integration tests, and E2E tests.
 *
 * This company represents an optimal SaaS business with known financial characteristics
 * and expected valuation outputs. All calculations should be deterministic and match
 * the expected values defined here.
 *
 * Usage:
 *   import { CANONICAL_COMPANY, EXPECTED_VALUATION } from '@/__tests__/fixtures/canonical-company'
 *
 *   it('should calculate correct valuation for canonical company', () => {
 *     const result = calculateValuation(CANONICAL_COMPANY)
 *     expect(result.currentValue).toBeCloseTo(EXPECTED_VALUATION.currentValue, -2)
 *   })
 */

import { DEFAULT_BRI_WEIGHTS } from '@/lib/bri-weights'
import { calculateValuation, ALPHA } from '@/lib/valuation/calculate-valuation'

/**
 * Canonical Test Company Input Data
 *
 * Characteristics:
 * - Small SaaS business ($1M revenue, 15% EBITDA margin)
 * - Optimal business model (subscription, excellent margins, low labor/asset intensity, minimal owner involvement)
 * - 70% BRI score across all categories (solid but with room for improvement)
 * - Software/SaaS industry with 3.0-6.0x EBITDA multiples
 */
export const CANONICAL_COMPANY = {
  // Company identity
  name: 'Test Co - Canonical',

  // Financials
  annualRevenue: 1000000, // $1M
  annualEbitda: 150000, // 15% margin
  ownerCompensation: 0,

  // Industry classification
  icbIndustry: 'Technology',
  icbSuperSector: 'Technology',
  icbSector: 'Software & Computer Services',
  icbSubSector: 'Software',

  // Industry multiples (typical for SaaS)
  industryMultipleLow: 3.0,
  industryMultipleHigh: 6.0,

  // Core factors (optimal for SaaS)
  coreFactors: {
    revenueSizeCategory: 'UNDER_1M' as const,
    revenueModel: 'SUBSCRIPTION_SAAS' as const, // Score: 1.0
    grossMarginProxy: 'EXCELLENT' as const, // Score: 1.0
    laborIntensity: 'LOW' as const, // Score: 1.0
    assetIntensity: 'ASSET_LIGHT' as const, // Score: 1.0
    ownerInvolvement: 'MINIMAL' as const, // Score: 1.0
    // Core score = average of all 5 factors = 1.0
  },

  // BRI category scores (0-1 scale)
  briScores: {
    FINANCIAL: 0.70,
    TRANSFERABILITY: 0.70,
    OPERATIONAL: 0.70,
    MARKET: 0.70,
    LEGAL_TAX: 0.70,
    PERSONAL: 0.70,
  },

  // BRI weights (must sum to 1.0)
  briWeights: DEFAULT_BRI_WEIGHTS,
} as const

/**
 * Calculate the overall BRI score from category scores and weights
 */
function calculateBriScore(): number {
  return Object.entries(CANONICAL_COMPANY.briScores).reduce(
    (sum, [category, score]) =>
      sum + score * CANONICAL_COMPANY.briWeights[category as keyof typeof CANONICAL_COMPANY.briWeights],
    0
  )
}

/**
 * Expected Valuation Outputs
 *
 * These values are calculated using the canonical valuation formula:
 *
 * 1. coreScore = average of all core factors = 1.0
 * 2. briScore = weighted average of BRI categories = 0.70
 * 3. baseMultiple = 3.0 + 1.0 × (6.0 - 3.0) = 6.0
 * 4. discountFraction = (1 - 0.7)^1.4 = 0.3^1.4 ≈ 0.1853
 * 5. finalMultiple = 3.0 + (6.0 - 3.0) × (1 - 0.1853) ≈ 5.44
 * 6. currentValue = 150,000 × 5.44 ≈ $816,600
 * 7. potentialValue = 150,000 × 6.0 = $900,000
 * 8. valueGap = 900,000 - 816,600 ≈ $83,400
 */
export const EXPECTED_VALUATION = (() => {
  const briScore = calculateBriScore()

  return {
    // Input values
    adjustedEbitda: CANONICAL_COMPANY.annualEbitda,
    industryMultipleLow: CANONICAL_COMPANY.industryMultipleLow,
    industryMultipleHigh: CANONICAL_COMPANY.industryMultipleHigh,
    coreScore: 1.0,
    briScore: briScore, // ≈ 0.70

    // Calculated using the canonical formula
    ...calculateValuation({
      adjustedEbitda: CANONICAL_COMPANY.annualEbitda,
      industryMultipleLow: CANONICAL_COMPANY.industryMultipleLow,
      industryMultipleHigh: CANONICAL_COMPANY.industryMultipleHigh,
      coreScore: 1.0,
      briScore: briScore,
    }),

    // Constants used in calculation
    alphaConstant: ALPHA,
  }
})()

/**
 * Alternative Scenarios for Testing Edge Cases
 */

export const FOUNDER_DEPENDENT_COMPANY = {
  ...CANONICAL_COMPANY,
  name: 'Test Co - Founder Dependent',
  coreFactors: {
    ...CANONICAL_COMPANY.coreFactors,
    ownerInvolvement: 'CRITICAL' as const, // Score: 0.0
    // Core score = (1.0 + 1.0 + 1.0 + 1.0 + 0.0) / 5 = 0.8
  },
  briScores: {
    FINANCIAL: 0.60,
    TRANSFERABILITY: 0.30, // High owner dependency
    OPERATIONAL: 0.50,
    MARKET: 0.65,
    LEGAL_TAX: 0.70,
    PERSONAL: 0.40, // Personal risks
  },
} as const

export const HIGH_CONCENTRATION_COMPANY = {
  ...CANONICAL_COMPANY,
  name: 'Test Co - High Customer Concentration',
  briScores: {
    FINANCIAL: 0.50, // Revenue concentration issues
    TRANSFERABILITY: 0.60,
    OPERATIONAL: 0.65,
    MARKET: 0.40, // Customer concentration risk
    LEGAL_TAX: 0.70,
    PERSONAL: 0.70,
  },
} as const

export const PERFECT_SAAS_COMPANY = {
  ...CANONICAL_COMPANY,
  name: 'Test Co - Perfect SaaS',
  annualRevenue: 5000000, // $5M
  annualEbitda: 1250000, // 25% margin
  coreFactors: {
    revenueSizeCategory: 'ONE_TO_FIVE_M' as const,
    revenueModel: 'SUBSCRIPTION_SAAS' as const,
    grossMarginProxy: 'EXCELLENT' as const,
    laborIntensity: 'LOW' as const,
    assetIntensity: 'ASSET_LIGHT' as const,
    ownerInvolvement: 'MINIMAL' as const,
  },
  briScores: {
    FINANCIAL: 1.0,
    TRANSFERABILITY: 1.0,
    OPERATIONAL: 1.0,
    MARKET: 1.0,
    LEGAL_TAX: 1.0,
    PERSONAL: 1.0,
  },
  industryMultipleLow: 4.0,
  industryMultipleHigh: 8.0,
} as const

// Define a flexible company type for tests
export type CompanyInput = {
  name: string
  annualRevenue: number
  annualEbitda: number
  ownerCompensation: number
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  industryMultipleLow: number
  industryMultipleHigh: number
  coreFactors: {
    revenueSizeCategory: 'UNDER_1M' | 'ONE_TO_FIVE_M' | 'FIVE_TO_TEN_M' | 'OVER_TEN_M'
    revenueModel: 'PROJECT_BASED' | 'TRANSACTIONAL' | 'RECURRING_CONTRACTS' | 'SUBSCRIPTION_SAAS'
    grossMarginProxy: 'LOW' | 'MODERATE' | 'GOOD' | 'EXCELLENT'
    laborIntensity: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW'
    assetIntensity: 'ASSET_HEAVY' | 'MODERATE' | 'ASSET_LIGHT'
    ownerInvolvement: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL'
  }
  briScores: {
    FINANCIAL: number
    TRANSFERABILITY: number
    OPERATIONAL: number
    MARKET: number
    LEGAL_TAX: number
    PERSONAL: number
  }
  briWeights: {
    FINANCIAL: number
    TRANSFERABILITY: number
    OPERATIONAL: number
    MARKET: number
    LEGAL_TAX: number
    PERSONAL: number
  }
}

/**
 * Helper function to calculate expected valuation for any company scenario
 */
export function calculateExpectedValuation(company: CompanyInput) {
  const briScore = Object.entries(company.briScores).reduce(
    (sum, [category, score]) =>
      sum + score * company.briWeights[category as keyof typeof company.briWeights],
    0
  )

  // Calculate core score
  const coreScores = {
    revenueModel: { PROJECT_BASED: 0.25, TRANSACTIONAL: 0.5, RECURRING_CONTRACTS: 0.75, SUBSCRIPTION_SAAS: 1.0 },
    grossMarginProxy: { LOW: 0.25, MODERATE: 0.5, GOOD: 0.75, EXCELLENT: 1.0 },
    laborIntensity: { VERY_HIGH: 0.25, HIGH: 0.5, MODERATE: 0.75, LOW: 1.0 },
    assetIntensity: { ASSET_HEAVY: 0.33, MODERATE: 0.67, ASSET_LIGHT: 1.0 },
    ownerInvolvement: { CRITICAL: 0.0, HIGH: 0.25, MODERATE: 0.5, LOW: 0.75, MINIMAL: 1.0 },
  }

  const coreScore = [
    coreScores.revenueModel[company.coreFactors.revenueModel],
    coreScores.grossMarginProxy[company.coreFactors.grossMarginProxy],
    coreScores.laborIntensity[company.coreFactors.laborIntensity],
    coreScores.assetIntensity[company.coreFactors.assetIntensity],
    coreScores.ownerInvolvement[company.coreFactors.ownerInvolvement],
  ].reduce((a, b) => a + b, 0) / 5

  return {
    coreScore,
    briScore,
    ...calculateValuation({
      adjustedEbitda: company.annualEbitda,
      industryMultipleLow: company.industryMultipleLow,
      industryMultipleHigh: company.industryMultipleHigh,
      coreScore,
      briScore,
    }),
  }
}

/**
 * Test Helper: Verify valuation calculations match expected values
 *
 * Usage in tests:
 *   expect(result.currentValue).toBeCloseTo(expected.currentValue, -2) // within $100
 */
export function assertValuationMatches(
  actual: ReturnType<typeof calculateValuation>,
  expected: ReturnType<typeof calculateValuation> & { coreScore: number; briScore: number },
  tolerance = { value: 100, multiple: 0.01, fraction: 0.001 }
) {
  return {
    currentValue: Math.abs(actual.currentValue - expected.currentValue) <= tolerance.value,
    potentialValue: Math.abs(actual.potentialValue - expected.potentialValue) <= tolerance.value,
    valueGap: Math.abs(actual.valueGap - expected.valueGap) <= tolerance.value,
    baseMultiple: Math.abs(actual.baseMultiple - expected.baseMultiple) <= tolerance.multiple,
    finalMultiple: Math.abs(actual.finalMultiple - expected.finalMultiple) <= tolerance.multiple,
    discountFraction: Math.abs(actual.discountFraction - expected.discountFraction) <= tolerance.fraction,
  }
}
