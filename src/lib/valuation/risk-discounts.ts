// Risk Discounts Engine (V2)
// Calculates discrete, named risk discounts applied multiplicatively to the quality-adjusted multiple.
// Each discount represents a specific, identifiable risk that buyers would price into a deal.

export interface RiskDiscount {
  name: string
  rate: number // 0-1 (e.g. 0.15 = 15% discount)
  explanation: string
}

export interface RiskDiscountInputs {
  /** Owner involvement level from core factors */
  ownerInvolvement: string | null
  /** BRI transferability score 0-1 */
  transferabilityScore: number | null
  /** Top single customer as fraction of revenue (0-1) */
  topCustomerConcentration: number | null
  /** Top 3 customers as fraction of revenue (0-1) */
  top3CustomerConcentration: number | null
  /** BRI LEGAL_TAX category score (0-1) */
  legalTaxScore: number | null
  /** BRI FINANCIAL category score - used for documentation quality proxy */
  financialScore: number | null
  /** Revenue size category */
  revenueSizeCategory: string | null
}

export interface RiskDiscountResult {
  discounts: RiskDiscount[]
  /** Product of (1 - discount_i) for all discounts — multiply by quality-adjusted multiple */
  riskMultiplier: number
  /** Aggregate risk severity score 0-1 (higher = more risk) */
  riskSeverityScore: number
}

// ─── DLOM (Discount for Lack of Marketability) ────────────────────────
// Every private company gets a DLOM. Larger companies get smaller DLOMs.
// Source: Stout Restricted Stock Study, FMV Opinions DLOM database
const DLOM_BY_SIZE: Record<string, number> = {
  UNDER_500K: 0.25,       // 25% — micro businesses
  FROM_500K_TO_1M: 0.22,  // 22%
  FROM_1M_TO_3M: 0.18,    // 18%
  FROM_3M_TO_10M: 0.15,   // 15%
  FROM_10M_TO_25M: 0.12,  // 12%
  OVER_25M: 0.10,         // 10%
}
const DEFAULT_DLOM = 0.18

// ─── Key-Person Discount ──────────────────────────────────────────────
// Based on owner involvement and BRI transferability score
const KEY_PERSON_RATES: Record<string, number> = {
  CRITICAL: 0.25,
  HIGH: 0.15,
  MODERATE: 0.08,
  LOW: 0.03,
  MINIMAL: 0.0,
}

// ─── Customer Concentration Discount ──────────────────────────────────
const CONCENTRATION_SINGLE_HIGH = 0.30 // threshold
const CONCENTRATION_SINGLE_RATE = 0.15
const CONCENTRATION_SINGLE_MODERATE = 0.20 // threshold
const CONCENTRATION_SINGLE_MODERATE_RATE = 0.08
const CONCENTRATION_TOP3_HIGH = 0.60 // threshold
const CONCENTRATION_TOP3_RATE = 0.10
const CONCENTRATION_TOP3_MODERATE = 0.40 // threshold
const CONCENTRATION_TOP3_MODERATE_RATE = 0.05

// ─── Documentation Quality Discount ──────────────────────────────────
// Poor financial documentation = higher buyer risk
const DOCS_DISCOUNT_THRESHOLD = 0.50 // below 50% BRI FINANCIAL triggers
const DOCS_DISCOUNT_RATE = 0.05

// ─── Legal/Tax Risk Discount ──────────────────────────────────────────
const LEGAL_DISCOUNT_THRESHOLD = 0.40 // below 40% BRI LEGAL_TAX triggers
const LEGAL_DISCOUNT_RATE = 0.08

/**
 * Calculate discrete risk discounts for V2 valuation.
 * Discounts are applied multiplicatively: riskMultiplier = product of (1 - rate_i)
 */
export function calculateRiskDiscounts(inputs: RiskDiscountInputs): RiskDiscountResult {
  const discounts: RiskDiscount[] = []

  // 1. DLOM — always applies to private companies
  const dlomRate = DLOM_BY_SIZE[inputs.revenueSizeCategory || ''] ?? DEFAULT_DLOM
  discounts.push({
    name: 'Lack of Marketability (DLOM)',
    rate: dlomRate,
    explanation: `Private companies are less liquid than public companies. Size-appropriate DLOM of ${(dlomRate * 100).toFixed(0)}% applied based on revenue category.`,
  })

  // 2. Key-Person Discount
  const keyPersonDiscount = calculateKeyPersonDiscount(inputs)
  if (keyPersonDiscount) {
    discounts.push(keyPersonDiscount)
  }

  // 3. Customer Concentration
  const concentrationDiscounts = calculateConcentrationDiscounts(inputs)
  discounts.push(...concentrationDiscounts)

  // 4. Documentation Quality
  if (inputs.financialScore !== null && inputs.financialScore < DOCS_DISCOUNT_THRESHOLD) {
    discounts.push({
      name: 'Documentation Quality',
      rate: DOCS_DISCOUNT_RATE,
      explanation: `Financial documentation score of ${(inputs.financialScore * 100).toFixed(0)}% is below the ${(DOCS_DISCOUNT_THRESHOLD * 100).toFixed(0)}% threshold. Buyers increase their risk premium when financials are poorly documented.`,
    })
  }

  // 5. Legal/Tax Risk
  if (inputs.legalTaxScore !== null && inputs.legalTaxScore < LEGAL_DISCOUNT_THRESHOLD) {
    discounts.push({
      name: 'Legal/Tax Risk',
      rate: LEGAL_DISCOUNT_RATE,
      explanation: `Legal/tax readiness score of ${(inputs.legalTaxScore * 100).toFixed(0)}% is below the ${(LEGAL_DISCOUNT_THRESHOLD * 100).toFixed(0)}% threshold. Unresolved legal or tax issues represent material risk to buyers.`,
    })
  }

  // Calculate multiplicative risk multiplier
  const riskMultiplier = discounts.reduce((product, d) => product * (1 - d.rate), 1)

  // Calculate aggregate risk severity score (0-1, higher = more risky)
  // This is 1 - riskMultiplier, which represents the total discount percentage
  const riskSeverityScore = 1 - riskMultiplier

  return { discounts, riskMultiplier, riskSeverityScore }
}

function calculateKeyPersonDiscount(inputs: RiskDiscountInputs): RiskDiscount | null {
  // Use owner involvement as primary signal, BRI transferability as modifier
  const baseRate = KEY_PERSON_RATES[inputs.ownerInvolvement || ''] ?? 0

  if (baseRate === 0) return null

  // If transferability score is available, blend it with the base rate
  // High transferability reduces the discount, low increases it
  let effectiveRate = baseRate
  if (inputs.transferabilityScore !== null) {
    // Transferability score of 1.0 reduces discount by 50%, 0.0 increases by 25%
    const modifier = 1 - (inputs.transferabilityScore - 0.5) * 0.5
    effectiveRate = Math.max(0, Math.min(0.30, baseRate * modifier))
  }

  if (effectiveRate < 0.02) return null // too small to matter

  return {
    name: 'Key-Person Risk',
    rate: Math.round(effectiveRate * 100) / 100,
    explanation: `Owner involvement level "${inputs.ownerInvolvement}" with transferability score of ${inputs.transferabilityScore !== null ? (inputs.transferabilityScore * 100).toFixed(0) + '%' : 'N/A'}. Business dependent on current owner creates acquisition risk.`,
  }
}

function calculateConcentrationDiscounts(inputs: RiskDiscountInputs): RiskDiscount[] {
  const discounts: RiskDiscount[] = []

  // Single customer concentration
  if (inputs.topCustomerConcentration !== null) {
    if (inputs.topCustomerConcentration >= CONCENTRATION_SINGLE_HIGH) {
      discounts.push({
        name: 'Customer Concentration (Single)',
        rate: CONCENTRATION_SINGLE_RATE,
        explanation: `Top customer represents ${(inputs.topCustomerConcentration * 100).toFixed(0)}% of revenue. Losing this customer would materially impact the business.`,
      })
    } else if (inputs.topCustomerConcentration >= CONCENTRATION_SINGLE_MODERATE) {
      discounts.push({
        name: 'Customer Concentration (Single)',
        rate: CONCENTRATION_SINGLE_MODERATE_RATE,
        explanation: `Top customer represents ${(inputs.topCustomerConcentration * 100).toFixed(0)}% of revenue — moderate concentration risk.`,
      })
    }
  }

  // Top 3 customers (only if single customer didn't already trigger high)
  const hasSingleHigh = discounts.some(d => d.name === 'Customer Concentration (Single)' && d.rate >= CONCENTRATION_SINGLE_RATE)
  if (!hasSingleHigh && inputs.top3CustomerConcentration !== null) {
    if (inputs.top3CustomerConcentration >= CONCENTRATION_TOP3_HIGH) {
      discounts.push({
        name: 'Customer Concentration (Top 3)',
        rate: CONCENTRATION_TOP3_RATE,
        explanation: `Top 3 customers represent ${(inputs.top3CustomerConcentration * 100).toFixed(0)}% of revenue. Concentrated customer base creates material risk.`,
      })
    } else if (inputs.top3CustomerConcentration >= CONCENTRATION_TOP3_MODERATE) {
      discounts.push({
        name: 'Customer Concentration (Top 3)',
        rate: CONCENTRATION_TOP3_MODERATE_RATE,
        explanation: `Top 3 customers represent ${(inputs.top3CustomerConcentration * 100).toFixed(0)}% of revenue — moderate concentration.`,
      })
    }
  }

  return discounts
}

// ─── Helpers for risk discount reducibility ──────────────────────────
// Used by value-gap-v2 to determine which discounts are addressable

/** Risk discounts that can be reduced through business improvements */
export const ADDRESSABLE_RISK_NAMES = [
  'Key-Person Risk',
  'Customer Concentration (Single)',
  'Customer Concentration (Top 3)',
  'Documentation Quality',
  'Legal/Tax Risk',
]

/** Risk discounts that are structural (cannot be reduced without a transaction) */
export const STRUCTURAL_RISK_NAMES = [
  'Lack of Marketability (DLOM)',
]

export function isAddressableDiscount(name: string): boolean {
  return ADDRESSABLE_RISK_NAMES.includes(name)
}

// Export constants for testing
export {
  DLOM_BY_SIZE,
  DEFAULT_DLOM,
  KEY_PERSON_RATES,
}
