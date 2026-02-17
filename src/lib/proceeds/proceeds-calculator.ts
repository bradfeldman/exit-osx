import { US_STATE_TAX_RATES } from '@/lib/retirement/retirement-calculator'

// --- Constants ---
export const DEFAULT_TRANSACTION_COST_RATE = 0.065
export const FEDERAL_LTCG_RATE = 0.20
export const NIIT_RATE = 0.038
export const CCORP_CORPORATE_RATE = 0.21
export const QSBS_EXCLUSION_LIMIT = 10_000_000

// --- Types ---
export type EntityType = 'C_CORP' | 'S_CORP' | 'LLC' | 'SOLE_PROP' | 'PARTNERSHIP'

export interface ProceedsInputs {
  enterpriseValue: number
  netDebt: number
  ownershipPercent: number
  transactionCostRate: number
  entityType: EntityType
  stateCode: string
  isQSBS: boolean
  costBasis: number
}

export interface ProceedsWaterfall {
  enterpriseValue: number
  lessNetDebt: number
  equityValue: number
  ownerShare: number
  lessTransactionCosts: number
  preTaxProceeds: number
  corporateTax: number
  capitalGainsTax: number
  niitTax: number
  stateTax: number
  totalTax: number
  effectiveTaxRate: number
  netProceeds: number
  qsbsExclusion: number
}

export { US_STATE_TAX_RATES }

/**
 * Calculate after-tax proceeds from a business sale.
 *
 * Tax logic:
 * - C_CORP (asset sale): Corporate tax (21%) on gain, then personal capital gains
 *   (20% + 3.8% NIIT + state) on distribution. ~40% effective.
 * - S_CORP/LLC/PARTNERSHIP/SOLE_PROP: Pass-through, personal capital gains only
 *   (20% + 3.8% NIIT + state). ~24-29%.
 * - QSBS: Up to $10M exclusion for qualified C-corp stock held 5+ years.
 */
export function calculateProceeds(inputs: ProceedsInputs): ProceedsWaterfall {
  const {
    enterpriseValue,
    netDebt,
    ownershipPercent,
    transactionCostRate,
    entityType,
    stateCode,
    isQSBS,
    costBasis,
  } = inputs

  // Step 1: Enterprise Value → Equity Value
  const equityValue = Math.max(0, enterpriseValue - netDebt)

  // Step 2: Owner's share
  const ownerShare = equityValue * (ownershipPercent / 100)

  // Step 3: Transaction costs
  const transactionCosts = ownerShare * transactionCostRate

  // Step 4: Pre-tax proceeds
  const preTaxProceeds = Math.max(0, ownerShare - transactionCosts)

  // Step 5: Taxable gain
  const taxableGain = Math.max(0, preTaxProceeds - costBasis)

  // Step 6: State tax rate lookup
  const stateEntry = US_STATE_TAX_RATES.find(s => s.code === stateCode)
  const stateTaxRate = stateEntry?.rate ?? 0

  let corporateTax = 0
  let capitalGainsTax = 0
  let niitTax = 0
  let stateTax = 0
  let qsbsExclusion = 0

  if (entityType === 'C_CORP') {
    if (isQSBS) {
      // QSBS: exclude up to $10M (or 10x cost basis, whichever is greater) from federal capital gains
      // Simplified: use $10M cap
      qsbsExclusion = Math.min(taxableGain, QSBS_EXCLUSION_LIMIT)
      const taxableAfterQSBS = Math.max(0, taxableGain - qsbsExclusion)

      // Stock sale with QSBS — no corporate-level tax (stock sale, not asset sale)
      capitalGainsTax = taxableAfterQSBS * FEDERAL_LTCG_RATE
      niitTax = taxableAfterQSBS * NIIT_RATE
      stateTax = taxableAfterQSBS * stateTaxRate
    } else {
      // C-Corp asset sale: double taxation
      // Layer 1: Corporate tax on gain
      corporateTax = taxableGain * CCORP_CORPORATE_RATE
      const afterCorpTax = taxableGain - corporateTax

      // Layer 2: Personal tax on distribution (treated as dividend/cap gains)
      capitalGainsTax = afterCorpTax * FEDERAL_LTCG_RATE
      niitTax = afterCorpTax * NIIT_RATE
      stateTax = afterCorpTax * stateTaxRate
    }
  } else {
    // Pass-through entities: single layer of tax
    capitalGainsTax = taxableGain * FEDERAL_LTCG_RATE
    niitTax = taxableGain * NIIT_RATE
    stateTax = taxableGain * stateTaxRate
  }

  const totalTax = corporateTax + capitalGainsTax + niitTax + stateTax
  const netProceeds = Math.max(0, preTaxProceeds - totalTax)
  const effectiveTaxRate = preTaxProceeds > 0 ? totalTax / preTaxProceeds : 0

  return {
    enterpriseValue,
    lessNetDebt: netDebt,
    equityValue,
    ownerShare,
    lessTransactionCosts: transactionCosts,
    preTaxProceeds,
    corporateTax,
    capitalGainsTax,
    niitTax,
    stateTax,
    totalTax,
    effectiveTaxRate,
    netProceeds,
    qsbsExclusion,
  }
}
