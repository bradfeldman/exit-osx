import { describe, it, expect } from 'vitest'
import {
  calculateRiskDiscounts,
  DLOM_BY_SIZE,
  DEFAULT_DLOM,
  KEY_PERSON_RATES,
  isAddressableDiscount,
  ADDRESSABLE_RISK_NAMES,
  STRUCTURAL_RISK_NAMES,
  type RiskDiscountInputs,
} from '@/lib/valuation/risk-discounts'

describe('Risk Discounts Engine', () => {
  const baseInputs: RiskDiscountInputs = {
    ownerInvolvement: 'MODERATE',
    transferabilityScore: 0.6,
    topCustomerConcentration: null,
    top3CustomerConcentration: null,
    legalTaxScore: 0.7,
    financialScore: 0.7,
    revenueSizeCategory: 'FROM_1M_TO_3M',
  }

  describe('DLOM', () => {
    it('always applies DLOM based on revenue size', () => {
      const result = calculateRiskDiscounts(baseInputs)
      const dlom = result.discounts.find(d => d.name.includes('DLOM'))
      expect(dlom).toBeDefined()
      expect(dlom!.rate).toBe(DLOM_BY_SIZE['FROM_1M_TO_3M'])
    })

    it('uses correct DLOM rates by size', () => {
      for (const [size, expectedRate] of Object.entries(DLOM_BY_SIZE)) {
        const result = calculateRiskDiscounts({ ...baseInputs, revenueSizeCategory: size })
        const dlom = result.discounts.find(d => d.name.includes('DLOM'))
        expect(dlom!.rate).toBe(expectedRate)
      }
    })

    it('uses default DLOM for unknown size', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, revenueSizeCategory: null })
      const dlom = result.discounts.find(d => d.name.includes('DLOM'))
      expect(dlom!.rate).toBe(DEFAULT_DLOM)
    })
  })

  describe('Key-Person Discount', () => {
    it('applies discount for CRITICAL owner involvement', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, ownerInvolvement: 'CRITICAL', transferabilityScore: 0.3 })
      const kp = result.discounts.find(d => d.name === 'Key-Person Risk')
      expect(kp).toBeDefined()
      expect(kp!.rate).toBeGreaterThan(0.15)
    })

    it('no discount for MINIMAL owner involvement', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, ownerInvolvement: 'MINIMAL' })
      const kp = result.discounts.find(d => d.name === 'Key-Person Risk')
      expect(kp).toBeUndefined()
    })

    it('high transferability reduces key-person discount', () => {
      const lowTransfer = calculateRiskDiscounts({ ...baseInputs, ownerInvolvement: 'HIGH', transferabilityScore: 0.2 })
      const highTransfer = calculateRiskDiscounts({ ...baseInputs, ownerInvolvement: 'HIGH', transferabilityScore: 0.9 })

      const kpLow = lowTransfer.discounts.find(d => d.name === 'Key-Person Risk')
      const kpHigh = highTransfer.discounts.find(d => d.name === 'Key-Person Risk')

      // High transferability should have lower or no discount
      const lowRate = kpLow?.rate ?? 0
      const highRate = kpHigh?.rate ?? 0
      expect(lowRate).toBeGreaterThanOrEqual(highRate)
    })
  })

  describe('Customer Concentration', () => {
    it('applies high single-customer discount at 30%+', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, topCustomerConcentration: 0.35 })
      const conc = result.discounts.find(d => d.name === 'Customer Concentration (Single)')
      expect(conc).toBeDefined()
      expect(conc!.rate).toBe(0.15)
    })

    it('applies moderate single-customer discount at 20-30%', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, topCustomerConcentration: 0.25 })
      const conc = result.discounts.find(d => d.name === 'Customer Concentration (Single)')
      expect(conc).toBeDefined()
      expect(conc!.rate).toBe(0.08)
    })

    it('no discount below 20%', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, topCustomerConcentration: 0.15 })
      const conc = result.discounts.find(d => d.name.includes('Concentration'))
      expect(conc).toBeUndefined()
    })

    it('applies top-3 discount when single is not high', () => {
      const result = calculateRiskDiscounts({
        ...baseInputs,
        topCustomerConcentration: 0.15, // below single threshold
        top3CustomerConcentration: 0.65,
      })
      const conc = result.discounts.find(d => d.name === 'Customer Concentration (Top 3)')
      expect(conc).toBeDefined()
      expect(conc!.rate).toBe(0.10)
    })

    it('does not double-count top-3 when single is already high', () => {
      const result = calculateRiskDiscounts({
        ...baseInputs,
        topCustomerConcentration: 0.40, // triggers high single
        top3CustomerConcentration: 0.70, // would trigger top-3 but should not
      })
      const concSingle = result.discounts.filter(d => d.name.includes('Single'))
      const concTop3 = result.discounts.filter(d => d.name.includes('Top 3'))
      expect(concSingle).toHaveLength(1)
      expect(concTop3).toHaveLength(0)
    })
  })

  describe('Documentation Quality', () => {
    it('applies discount when financial score below threshold', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, financialScore: 0.30 })
      const docs = result.discounts.find(d => d.name === 'Documentation Quality')
      expect(docs).toBeDefined()
      expect(docs!.rate).toBe(0.05)
    })

    it('no discount when financial score is healthy', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, financialScore: 0.70 })
      const docs = result.discounts.find(d => d.name === 'Documentation Quality')
      expect(docs).toBeUndefined()
    })
  })

  describe('Legal/Tax Risk', () => {
    it('applies discount when legal score below threshold', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, legalTaxScore: 0.30 })
      const legal = result.discounts.find(d => d.name === 'Legal/Tax Risk')
      expect(legal).toBeDefined()
      expect(legal!.rate).toBe(0.08)
    })

    it('no discount when legal score is healthy', () => {
      const result = calculateRiskDiscounts({ ...baseInputs, legalTaxScore: 0.60 })
      const legal = result.discounts.find(d => d.name === 'Legal/Tax Risk')
      expect(legal).toBeUndefined()
    })
  })

  describe('Risk Multiplier', () => {
    it('is multiplicative product of (1 - rate_i)', () => {
      const result = calculateRiskDiscounts(baseInputs)
      const expectedMultiplier = result.discounts.reduce((p, d) => p * (1 - d.rate), 1)
      expect(result.riskMultiplier).toBeCloseTo(expectedMultiplier, 10)
    })

    it('is between 0 and 1', () => {
      const result = calculateRiskDiscounts(baseInputs)
      expect(result.riskMultiplier).toBeGreaterThan(0)
      expect(result.riskMultiplier).toBeLessThanOrEqual(1)
    })

    it('worst case has low multiplier', () => {
      const worstCase: RiskDiscountInputs = {
        ownerInvolvement: 'CRITICAL',
        transferabilityScore: 0.1,
        topCustomerConcentration: 0.50,
        top3CustomerConcentration: 0.80,
        legalTaxScore: 0.20,
        financialScore: 0.20,
        revenueSizeCategory: 'UNDER_500K',
      }
      const result = calculateRiskDiscounts(worstCase)
      expect(result.riskMultiplier).toBeLessThan(0.5)
    })

    it('best case has high multiplier (only DLOM)', () => {
      const bestCase: RiskDiscountInputs = {
        ownerInvolvement: 'MINIMAL',
        transferabilityScore: 1.0,
        topCustomerConcentration: 0.05,
        top3CustomerConcentration: 0.15,
        legalTaxScore: 0.90,
        financialScore: 0.90,
        revenueSizeCategory: 'OVER_25M',
      }
      const result = calculateRiskDiscounts(bestCase)
      expect(result.discounts).toHaveLength(1) // only DLOM
      expect(result.riskMultiplier).toBeGreaterThan(0.85)
    })
  })

  describe('Risk Severity Score', () => {
    it('is 1 - riskMultiplier', () => {
      const result = calculateRiskDiscounts(baseInputs)
      expect(result.riskSeverityScore).toBeCloseTo(1 - result.riskMultiplier, 10)
    })
  })

  describe('Addressable vs Structural classification', () => {
    it('DLOM is structural', () => {
      expect(isAddressableDiscount('Lack of Marketability (DLOM)')).toBe(false)
    })

    it('Key-Person is addressable', () => {
      expect(isAddressableDiscount('Key-Person Risk')).toBe(true)
    })

    it('all addressable names are known', () => {
      for (const name of ADDRESSABLE_RISK_NAMES) {
        expect(isAddressableDiscount(name)).toBe(true)
      }
    })

    it('all structural names are not addressable', () => {
      for (const name of STRUCTURAL_RISK_NAMES) {
        expect(isAddressableDiscount(name)).toBe(false)
      }
    })
  })
})
