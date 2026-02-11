import { describe, it, expect } from 'vitest'
import {
  detectTaxTreatment,
  detectTaxTreatmentFromCategory,
  getTaxTreatmentReason,
} from '@/lib/retirement/account-type-detector'
import {
  calculateAfterTaxValue,
  calculateTotalAfterTaxValue,
  type RetirementAsset,
  type RetirementAssumptions,
  DEFAULT_ASSUMPTIONS,
} from '@/lib/retirement/retirement-calculator'

// =============================================================================
// PROD-046: Retirement Tax Treatment Tests
// =============================================================================

describe('PROD-046: Account Type Detector', () => {

  // ---------------------------------------------------------------------------
  // Tax-free accounts (Roth, HSA)
  // ---------------------------------------------------------------------------
  describe('Tax-free detection (Roth, HSA)', () => {
    it('detects "Roth IRA" as tax_free', () => {
      expect(detectTaxTreatment('Roth IRA')).toBe('tax_free')
    })

    it('detects "Roth 401k" as tax_free', () => {
      expect(detectTaxTreatment('Roth 401k')).toBe('tax_free')
    })

    it('detects "Roth 401(k)" as tax_free', () => {
      expect(detectTaxTreatment('Roth 401(k)')).toBe('tax_free')
    })

    it('detects "roth ira" (lowercase) as tax_free', () => {
      expect(detectTaxTreatment('roth ira')).toBe('tax_free')
    })

    it('detects "ROTH IRA" (uppercase) as tax_free', () => {
      expect(detectTaxTreatment('ROTH IRA')).toBe('tax_free')
    })

    it('detects "Fidelity Roth IRA" as tax_free', () => {
      expect(detectTaxTreatment('Fidelity Roth IRA')).toBe('tax_free')
    })

    it('detects "Vanguard Roth 401(k)" as tax_free', () => {
      expect(detectTaxTreatment('Vanguard Roth 401(k)')).toBe('tax_free')
    })

    it('detects "HSA" as tax_free', () => {
      expect(detectTaxTreatment('HSA')).toBe('tax_free')
    })

    it('detects "Health Savings Account" as tax_free', () => {
      expect(detectTaxTreatment('Health Savings Account')).toBe('tax_free')
    })

    it('detects "Fidelity HSA" as tax_free', () => {
      expect(detectTaxTreatment('Fidelity HSA')).toBe('tax_free')
    })

    // CRITICAL: Roth must take priority over IRA/401k (which are tax_deferred)
    it('Roth IRA is tax_free, NOT tax_deferred despite containing "IRA"', () => {
      expect(detectTaxTreatment('Roth IRA')).toBe('tax_free')
      expect(detectTaxTreatment('Roth IRA')).not.toBe('tax_deferred')
    })

    it('Roth 401k is tax_free, NOT tax_deferred despite containing "401k"', () => {
      expect(detectTaxTreatment('Roth 401k')).toBe('tax_free')
      expect(detectTaxTreatment('Roth 401k')).not.toBe('tax_deferred')
    })
  })

  // ---------------------------------------------------------------------------
  // Tax-deferred accounts (Traditional, 401k, IRA, etc.)
  // ---------------------------------------------------------------------------
  describe('Tax-deferred detection (Traditional, 401k, IRA)', () => {
    it('detects "Traditional IRA" as tax_deferred', () => {
      expect(detectTaxTreatment('Traditional IRA')).toBe('tax_deferred')
    })

    it('detects "401k" as tax_deferred', () => {
      expect(detectTaxTreatment('401k')).toBe('tax_deferred')
    })

    it('detects "401(k)" as tax_deferred', () => {
      expect(detectTaxTreatment('401(k)')).toBe('tax_deferred')
    })

    it('detects "Company 401k Plan" as tax_deferred', () => {
      expect(detectTaxTreatment('Company 401k Plan')).toBe('tax_deferred')
    })

    it('detects "403b" as tax_deferred', () => {
      expect(detectTaxTreatment('403b')).toBe('tax_deferred')
    })

    it('detects "403(b)" as tax_deferred', () => {
      expect(detectTaxTreatment('403(b)')).toBe('tax_deferred')
    })

    it('detects "457(b)" as tax_deferred', () => {
      expect(detectTaxTreatment('457(b)')).toBe('tax_deferred')
    })

    it('detects "SEP IRA" as tax_deferred', () => {
      expect(detectTaxTreatment('SEP IRA')).toBe('tax_deferred')
    })

    it('detects "SIMPLE IRA" as tax_deferred', () => {
      expect(detectTaxTreatment('SIMPLE IRA')).toBe('tax_deferred')
    })

    it('detects "Rollover IRA" as tax_deferred', () => {
      expect(detectTaxTreatment('Rollover IRA')).toBe('tax_deferred')
    })

    it('detects generic "IRA" as tax_deferred', () => {
      expect(detectTaxTreatment('IRA')).toBe('tax_deferred')
    })

    it('detects "My IRA Account" as tax_deferred', () => {
      expect(detectTaxTreatment('My IRA Account')).toBe('tax_deferred')
    })

    it('detects "Pension" as tax_deferred', () => {
      expect(detectTaxTreatment('Pension')).toBe('tax_deferred')
    })

    it('detects "State Pension Plan" as tax_deferred', () => {
      expect(detectTaxTreatment('State Pension Plan')).toBe('tax_deferred')
    })

    it('detects "Annuity" as tax_deferred', () => {
      expect(detectTaxTreatment('Annuity')).toBe('tax_deferred')
    })

    it('detects "Deferred Compensation Plan" as tax_deferred', () => {
      expect(detectTaxTreatment('Deferred Compensation Plan')).toBe('tax_deferred')
    })

    it('detects "TSP" as tax_deferred', () => {
      expect(detectTaxTreatment('TSP')).toBe('tax_deferred')
    })

    it('detects "Thrift Savings Plan" as tax_deferred', () => {
      expect(detectTaxTreatment('Thrift Savings Plan')).toBe('tax_deferred')
    })

    it('detects "401a" as tax_deferred', () => {
      expect(detectTaxTreatment('401a')).toBe('tax_deferred')
    })
  })

  // ---------------------------------------------------------------------------
  // Capital gains accounts
  // ---------------------------------------------------------------------------
  describe('Capital gains detection (Brokerage, stocks, real estate)', () => {
    it('detects "Brokerage Account" as capital_gains', () => {
      expect(detectTaxTreatment('Brokerage Account')).toBe('capital_gains')
    })

    it('detects "Taxable Investment Account" as capital_gains', () => {
      expect(detectTaxTreatment('Taxable Investment Account')).toBe('capital_gains')
    })

    it('detects "Stock Portfolio" as capital_gains', () => {
      expect(detectTaxTreatment('Stock Portfolio')).toBe('capital_gains')
    })

    it('detects "Mutual Fund Account" as capital_gains', () => {
      expect(detectTaxTreatment('Mutual Fund Account')).toBe('capital_gains')
    })

    it('detects "ETF Portfolio" as capital_gains', () => {
      expect(detectTaxTreatment('ETF Portfolio')).toBe('capital_gains')
    })

    it('detects "Rental Property" as capital_gains', () => {
      expect(detectTaxTreatment('Rental Property')).toBe('capital_gains')
    })

    it('detects "Real Estate Investment" as capital_gains', () => {
      expect(detectTaxTreatment('Real Estate Investment')).toBe('capital_gains')
    })

    it('detects "Cryptocurrency" as capital_gains', () => {
      expect(detectTaxTreatment('Cryptocurrency')).toBe('capital_gains')
    })

    it('detects "Business Interest" as capital_gains', () => {
      expect(detectTaxTreatment('Business Interest')).toBe('capital_gains')
    })

    it('detects "Trust Account" as capital_gains', () => {
      expect(detectTaxTreatment('Trust Account')).toBe('capital_gains')
    })
  })

  // ---------------------------------------------------------------------------
  // Already-taxed accounts
  // ---------------------------------------------------------------------------
  describe('Already-taxed detection (Cash, savings)', () => {
    it('detects "Cash" as already_taxed', () => {
      expect(detectTaxTreatment('Cash')).toBe('already_taxed')
    })

    it('detects "Savings Account" as already_taxed', () => {
      expect(detectTaxTreatment('Savings Account')).toBe('already_taxed')
    })

    it('detects "Checking Account" as already_taxed', () => {
      expect(detectTaxTreatment('Checking Account')).toBe('already_taxed')
    })

    it('detects "Money Market" as already_taxed', () => {
      expect(detectTaxTreatment('Money Market')).toBe('already_taxed')
    })

    it('detects "CD" as already_taxed', () => {
      expect(detectTaxTreatment('CD')).toBe('already_taxed')
    })

    it('detects "Certificate of Deposit" as already_taxed', () => {
      expect(detectTaxTreatment('Certificate of Deposit')).toBe('already_taxed')
    })
  })

  // ---------------------------------------------------------------------------
  // Category-based fallback
  // ---------------------------------------------------------------------------
  describe('Category-based fallback', () => {
    it('falls back to tax_deferred for "Retirement Accounts" category', () => {
      expect(detectTaxTreatment('Unknown Account', 'Retirement Accounts')).toBe('tax_deferred')
    })

    it('falls back to capital_gains for "Investment Accounts" category', () => {
      expect(detectTaxTreatment('Unknown Account', 'Investment Accounts')).toBe('capital_gains')
    })

    it('falls back to capital_gains for "Real Estate" category', () => {
      expect(detectTaxTreatment('Unknown Account', 'Real Estate')).toBe('capital_gains')
    })

    it('falls back to already_taxed for "Cash" category', () => {
      expect(detectTaxTreatment('Unknown Account', 'Cash')).toBe('already_taxed')
    })

    it('falls back to already_taxed for unknown category', () => {
      expect(detectTaxTreatment('Unknown Account', 'Other')).toBe('already_taxed')
    })

    it('defaults to already_taxed with no name and no category', () => {
      expect(detectTaxTreatment('')).toBe('already_taxed')
    })

    it('name-based detection takes priority over category fallback', () => {
      // "Roth IRA" should be tax_free even if category says "Retirement Accounts"
      expect(detectTaxTreatment('Roth IRA', 'Retirement Accounts')).toBe('tax_free')
    })
  })

  // ---------------------------------------------------------------------------
  // detectTaxTreatmentFromCategory (standalone)
  // ---------------------------------------------------------------------------
  describe('detectTaxTreatmentFromCategory', () => {
    it('maps retirement category to tax_deferred', () => {
      expect(detectTaxTreatmentFromCategory('Retirement Accounts')).toBe('tax_deferred')
    })

    it('maps investment category to capital_gains', () => {
      expect(detectTaxTreatmentFromCategory('Investment Accounts')).toBe('capital_gains')
    })

    it('maps real estate to capital_gains', () => {
      expect(detectTaxTreatmentFromCategory('Real Estate')).toBe('capital_gains')
    })

    it('maps business category to capital_gains', () => {
      expect(detectTaxTreatmentFromCategory('Business Interest')).toBe('capital_gains')
    })

    it('maps cash to already_taxed', () => {
      expect(detectTaxTreatmentFromCategory('Cash')).toBe('already_taxed')
    })

    it('maps savings to already_taxed', () => {
      expect(detectTaxTreatmentFromCategory('Savings')).toBe('already_taxed')
    })
  })

  // ---------------------------------------------------------------------------
  // getTaxTreatmentReason
  // ---------------------------------------------------------------------------
  describe('getTaxTreatmentReason', () => {
    it('explains Roth accounts', () => {
      const reason = getTaxTreatmentReason('Roth IRA')
      expect(reason).toContain('Roth')
      expect(reason).toContain('tax-free')
    })

    it('explains HSA accounts', () => {
      const reason = getTaxTreatmentReason('HSA')
      expect(reason).toContain('HSA')
      expect(reason).toContain('tax-free')
    })

    it('explains tax-deferred accounts', () => {
      const reason = getTaxTreatmentReason('Traditional 401k')
      expect(reason).toContain('tax-deferred')
      expect(reason).toContain('ordinary income')
    })

    it('explains capital gains accounts', () => {
      const reason = getTaxTreatmentReason('Brokerage Account')
      expect(reason).toContain('capital gains')
    })

    it('explains already-taxed accounts', () => {
      const reason = getTaxTreatmentReason('Savings Account')
      expect(reason).toContain('already-taxed')
    })

    it('provides category-based reason for unmatched names', () => {
      const reason = getTaxTreatmentReason('My Account', 'Retirement Accounts')
      expect(reason).toContain('Retirement')
    })

    it('provides default reason for completely unknown accounts', () => {
      const reason = getTaxTreatmentReason('')
      expect(reason).toContain('Default')
    })
  })
})

// =============================================================================
// PROD-046: Tax Treatment Impact on After-Tax Calculations
// =============================================================================

describe('PROD-046: Tax Treatment Impact on Calculations', () => {
  const assumptions: RetirementAssumptions = {
    ...DEFAULT_ASSUMPTIONS,
    federalTaxRate: 0.22,
    stateTaxRate: 0.05,
    localTaxRate: 0,
    capitalGainsTaxRate: 0.15,
  }

  // Total income tax rate: 0.22 + 0.05 + 0 = 0.27 (27%)

  it('Roth IRA withdrawal is tax-free (no tax deduction)', () => {
    const rothAsset: RetirementAsset = {
      id: 'roth-1',
      name: 'Roth IRA',
      category: 'Retirement Accounts',
      currentValue: 500000,
      taxTreatment: 'tax_free',
    }
    const afterTax = calculateAfterTaxValue(rothAsset, assumptions)
    expect(afterTax).toBe(500000) // Full value — no tax
  })

  it('Traditional IRA withdrawal is taxed at income rate', () => {
    const tradAsset: RetirementAsset = {
      id: 'trad-1',
      name: 'Traditional IRA',
      category: 'Retirement Accounts',
      currentValue: 500000,
      taxTreatment: 'tax_deferred',
    }
    const afterTax = calculateAfterTaxValue(tradAsset, assumptions)
    // $500K * (1 - 0.27) = $365,000
    expect(afterTax).toBe(365000)
  })

  it('Brokerage account pays capital gains on appreciation only', () => {
    const brokerageAsset: RetirementAsset = {
      id: 'brokerage-1',
      name: 'Brokerage Account',
      category: 'Investment Accounts',
      currentValue: 500000,
      taxTreatment: 'capital_gains',
      costBasis: 200000,
    }
    const afterTax = calculateAfterTaxValue(brokerageAsset, assumptions)
    // Gain = $500K - $200K = $300K
    // Tax = $300K * 0.15 = $45K
    // After-tax = $500K - $45K = $455K
    expect(afterTax).toBe(455000)
  })

  it('Cash account is already taxed (no deduction)', () => {
    const cashAsset: RetirementAsset = {
      id: 'cash-1',
      name: 'Cash',
      category: 'Cash',
      currentValue: 100000,
      taxTreatment: 'already_taxed',
    }
    const afterTax = calculateAfterTaxValue(cashAsset, assumptions)
    expect(afterTax).toBe(100000)
  })

  // ---------------------------------------------------------------------------
  // CRITICAL REGRESSION TEST: The original bug
  // ---------------------------------------------------------------------------
  it('REGRESSION: Roth IRA is NOT taxed like Traditional IRA', () => {
    // This is the exact bug reported in PROD-046:
    // Previously, both Roth and Traditional were treated as tax_deferred
    const rothAsset: RetirementAsset = {
      id: 'roth',
      name: 'Roth IRA',
      category: 'Retirement Accounts',
      currentValue: 1000000,
      taxTreatment: 'tax_free', // CORRECT: tax_free
    }
    const tradAsset: RetirementAsset = {
      id: 'trad',
      name: 'Traditional IRA',
      category: 'Retirement Accounts',
      currentValue: 1000000,
      taxTreatment: 'tax_deferred',
    }

    const rothAfterTax = calculateAfterTaxValue(rothAsset, assumptions)
    const tradAfterTax = calculateAfterTaxValue(tradAsset, assumptions)

    // Roth should be worth MORE after tax because withdrawals are tax-free
    expect(rothAfterTax).toBeGreaterThan(tradAfterTax)
    expect(rothAfterTax).toBe(1000000)
    expect(tradAfterTax).toBe(730000) // $1M * (1 - 0.27)
  })

  // ---------------------------------------------------------------------------
  // Portfolio-level impact
  // ---------------------------------------------------------------------------
  it('correctly calculates total after-tax value for mixed portfolio', () => {
    const assets: RetirementAsset[] = [
      {
        id: '1',
        name: 'Roth 401k',
        category: 'Retirement Accounts',
        currentValue: 300000,
        taxTreatment: 'tax_free',
      },
      {
        id: '2',
        name: 'Traditional 401k',
        category: 'Retirement Accounts',
        currentValue: 500000,
        taxTreatment: 'tax_deferred',
      },
      {
        id: '3',
        name: 'Brokerage',
        category: 'Investment Accounts',
        currentValue: 200000,
        taxTreatment: 'capital_gains',
        costBasis: 100000,
      },
      {
        id: '4',
        name: 'Cash',
        category: 'Cash',
        currentValue: 50000,
        taxTreatment: 'already_taxed',
      },
    ]

    const total = calculateTotalAfterTaxValue(assets, assumptions)

    // Roth 401k: $300K (tax-free)
    // Traditional 401k: $500K * (1 - 0.27) = $365K
    // Brokerage: $200K - ($100K gain * 0.15) = $185K
    // Cash: $50K
    // Total: $300K + $365K + $185K + $50K = $900K
    expect(total).toBe(900000)
  })

  it('auto-detection integrated with calculations produces correct results', () => {
    // Simulate what the retirement page does after PROD-046 fix:
    // 1. Detect tax treatment from account name
    // 2. Calculate after-tax value

    const pfsAssets = [
      { description: 'Roth IRA at Fidelity', category: 'Retirement Accounts', value: 400000 },
      { description: 'Company 401k', category: 'Retirement Accounts', value: 600000 },
      { description: 'Vanguard Brokerage', category: 'Investment Accounts', value: 300000 },
    ]

    const retirementAssets: RetirementAsset[] = pfsAssets.map((asset, i) => ({
      id: `asset-${i}`,
      name: asset.description,
      category: asset.category,
      currentValue: asset.value,
      taxTreatment: detectTaxTreatment(asset.description, asset.category),
      costBasis: 0,
    }))

    // Verify detection
    expect(retirementAssets[0].taxTreatment).toBe('tax_free')      // Roth IRA
    expect(retirementAssets[1].taxTreatment).toBe('tax_deferred')  // 401k
    expect(retirementAssets[2].taxTreatment).toBe('capital_gains') // Brokerage

    // Calculate totals
    const total = calculateTotalAfterTaxValue(retirementAssets, assumptions)

    // Roth: $400K (tax-free)
    // 401k: $600K * (1 - 0.27) = $438K
    // Brokerage: $300K - ($300K * 0.15) = $255K (cost basis is 0, so full value is gain)
    // Total: $400K + $438K + $255K = $1,093K
    expect(total).toBe(1093000)
  })
})
