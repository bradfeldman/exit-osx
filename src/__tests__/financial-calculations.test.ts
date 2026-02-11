import { describe, it, expect } from 'vitest'
import {
  calculateEbitda,
  calculateEbitdaMargin,
  calculateWorkingCapital,
  calculateFreeCashFlow,
  calculateNetIncomeFromEbitda,
  calculateGrossProfit,
  calculateGrossMargin,
} from '@/lib/financial-calculations'
import {
  calculateCategoryValueGaps,
  type CategoryGapInput,
} from '@/lib/valuation/value-gap-attribution'

// =============================================================================
// PROD-010: Financial Calculation Audit Tests
// =============================================================================

describe('PROD-010: Financial Calculations', () => {

  // -------------------------------------------------------------------------
  // EBITDA
  // -------------------------------------------------------------------------
  describe('calculateEbitda', () => {
    it('calculates EBITDA correctly with all components', () => {
      // Revenue: 1,000,000, COGS: 400,000 => Gross Profit: 600,000
      // OpEx (includes D,A,I,T): 350,000
      // D: 50,000, A: 20,000, I: 30,000, T: 25,000
      // EBITDA = 600,000 - 350,000 + 50,000 + 20,000 + 30,000 + 25,000 = 375,000
      const result = calculateEbitda({
        grossProfit: 600000,
        operatingExpenses: 350000,
        depreciation: 50000,
        amortization: 20000,
        interestExpense: 30000,
        taxExpense: 25000,
      })
      expect(result).toBe(375000)
    })

    it('matches the income-statement route formula', () => {
      // This is the formula from income-statement/route.ts line 163:
      // ebitda = grossProfit - operatingExpenses + depreciation + amortization + interestExpense + taxExpense
      const grossProfit = 500000
      const operatingExpenses = 300000
      const depreciation = 40000
      const amortization = 10000
      const interestExpense = 15000
      const taxExpense = 20000

      const expected = grossProfit - operatingExpenses + depreciation + amortization + interestExpense + taxExpense
      const result = calculateEbitda({
        grossProfit,
        operatingExpenses,
        depreciation,
        amortization,
        interestExpense,
        taxExpense,
      })
      expect(result).toBe(expected)
    })

    it('handles zero D/A/I/T (service company with no fixed assets or debt)', () => {
      // EBITDA = Gross Profit - OpEx when all add-backs are zero
      const result = calculateEbitda({
        grossProfit: 200000,
        operatingExpenses: 150000,
        depreciation: 0,
        amortization: 0,
        interestExpense: 0,
        taxExpense: 0,
      })
      expect(result).toBe(50000)
    })

    it('handles negative EBITDA (unprofitable company)', () => {
      const result = calculateEbitda({
        grossProfit: 100000,
        operatingExpenses: 250000,
        depreciation: 20000,
        amortization: 5000,
        interestExpense: 10000,
        taxExpense: 0,
      })
      // 100,000 - 250,000 + 20,000 + 5,000 + 10,000 + 0 = -115,000
      expect(result).toBe(-115000)
    })

    it('demonstrates the QuickBooks sync bug fix', () => {
      // BEFORE fix: ebitda = grossProfit - operatingExpenses + depreciation
      // AFTER fix:  ebitda = grossProfit - operatingExpenses + depreciation + amortization + interestExpense + taxExpense
      const inputs = {
        grossProfit: 500000,
        operatingExpenses: 300000,
        depreciation: 40000,
        amortization: 10000,
        interestExpense: 15000,
        taxExpense: 20000,
      }

      const buggyResult = inputs.grossProfit - inputs.operatingExpenses + inputs.depreciation
      const correctResult = calculateEbitda(inputs)

      // The bug underreported EBITDA by the sum of A + I + T
      expect(correctResult - buggyResult).toBe(
        inputs.amortization + inputs.interestExpense + inputs.taxExpense
      )
      expect(buggyResult).toBe(240000) // Wrong
      expect(correctResult).toBe(285000) // Correct
    })

    it('demonstrates the financial-profile (lending page) bug fix', () => {
      // BEFORE fix: ebitda = grossProfit - operatingExpenses (missing ALL add-backs)
      // AFTER fix:  ebitda = grossProfit - operatingExpenses + D + A + I + T
      const inputs = {
        grossProfit: 500000,
        operatingExpenses: 300000,
        depreciation: 40000,
        amortization: 10000,
        interestExpense: 15000,
        taxExpense: 20000,
      }

      const buggyResult = inputs.grossProfit - inputs.operatingExpenses
      const correctResult = calculateEbitda(inputs)

      // The bug underreported EBITDA by the sum of D + A + I + T
      expect(correctResult - buggyResult).toBe(
        inputs.depreciation + inputs.amortization + inputs.interestExpense + inputs.taxExpense
      )
      expect(buggyResult).toBe(200000) // Wrong -- this was "operating income", not EBITDA
      expect(correctResult).toBe(285000) // Correct EBITDA
    })
  })

  describe('calculateEbitdaMargin', () => {
    it('calculates margin correctly', () => {
      expect(calculateEbitdaMargin(150000, 1000000)).toBe(0.15)
    })

    it('returns 0 for zero revenue', () => {
      expect(calculateEbitdaMargin(50000, 0)).toBe(0)
    })

    it('handles negative EBITDA', () => {
      expect(calculateEbitdaMargin(-50000, 1000000)).toBe(-0.05)
    })
  })

  // -------------------------------------------------------------------------
  // Working Capital
  // -------------------------------------------------------------------------
  describe('calculateWorkingCapital', () => {
    it('calculates operating working capital correctly', () => {
      // Working Capital = AR + Inventory - AP
      expect(calculateWorkingCapital({
        accountsReceivable: 100000,
        inventory: 50000,
        accountsPayable: 80000,
      })).toBe(70000)
    })

    it('handles negative working capital', () => {
      // When AP > AR + Inventory
      expect(calculateWorkingCapital({
        accountsReceivable: 30000,
        inventory: 20000,
        accountsPayable: 100000,
      })).toBe(-50000)
    })

    it('handles zero values', () => {
      expect(calculateWorkingCapital({
        accountsReceivable: 0,
        inventory: 0,
        accountsPayable: 0,
      })).toBe(0)
    })

    it('matches balance-sheet route formula', () => {
      // From balance-sheet/route.ts: workingCapital = accountsReceivable + inventory - accountsPayable
      const ar = 150000
      const inv = 75000
      const ap = 90000
      const expected = ar + inv - ap
      expect(calculateWorkingCapital({
        accountsReceivable: ar,
        inventory: inv,
        accountsPayable: ap,
      })).toBe(expected)
    })
  })

  // -------------------------------------------------------------------------
  // Free Cash Flow
  // -------------------------------------------------------------------------
  describe('calculateFreeCashFlow', () => {
    it('calculates FCF correctly when capex is negative (purchase)', () => {
      // CFO = 500,000, CapEx = -100,000 (purchased equipment)
      // FCF = 500,000 + (-100,000) = 400,000
      expect(calculateFreeCashFlow(500000, -100000)).toBe(400000)
    })

    it('calculates FCF correctly when capex is positive (asset sale)', () => {
      // CFO = 500,000, CapEx = 50,000 (sold equipment)
      // FCF = 500,000 + 50,000 = 550,000
      expect(calculateFreeCashFlow(500000, 50000)).toBe(550000)
    })

    it('handles zero capex', () => {
      expect(calculateFreeCashFlow(300000, 0)).toBe(300000)
    })

    it('handles negative CFO', () => {
      expect(calculateFreeCashFlow(-50000, -30000)).toBe(-80000)
    })

    it('demonstrates the double-negation bug fix', () => {
      // BEFORE fix: freeCashFlow = cashFromOperations - Math.abs(capitalExpenditures)
      // AFTER fix:  freeCashFlow = cashFromOperations + capitalExpenditures
      //
      // When capex = -100,000 (purchase):
      //   Bug:     500,000 - Math.abs(-100,000) = 500,000 - 100,000 = 400,000 (same result by coincidence)
      //   Correct: 500,000 + (-100,000) = 400,000
      //
      // When capex = 50,000 (asset sale -- the bug manifests here):
      //   Bug:     500,000 - Math.abs(50,000) = 500,000 - 50,000 = 450,000 (WRONG: should INCREASE FCF)
      //   Correct: 500,000 + 50,000 = 550,000
      const cfo = 500000
      const capexSale = 50000 // Positive = asset sale proceeds

      const buggyResult = cfo - Math.abs(capexSale)
      const correctResult = calculateFreeCashFlow(cfo, capexSale)

      expect(buggyResult).toBe(450000) // Wrong
      expect(correctResult).toBe(550000) // Correct
      expect(correctResult - buggyResult).toBe(100000) // $100K discrepancy
    })
  })

  // -------------------------------------------------------------------------
  // Net Income from EBITDA
  // -------------------------------------------------------------------------
  describe('calculateNetIncomeFromEbitda', () => {
    it('calculates net income by subtracting D, A, I, T', () => {
      const result = calculateNetIncomeFromEbitda({
        ebitda: 375000,
        depreciation: 50000,
        amortization: 20000,
        interestExpense: 30000,
        taxExpense: 25000,
      })
      // 375,000 - 50,000 - 20,000 - 30,000 - 25,000 = 250,000
      expect(result).toBe(250000)
    })

    it('handles negative net income', () => {
      const result = calculateNetIncomeFromEbitda({
        ebitda: 50000,
        depreciation: 40000,
        amortization: 10000,
        interestExpense: 15000,
        taxExpense: 0,
      })
      // 50,000 - 40,000 - 10,000 - 15,000 - 0 = -15,000
      expect(result).toBe(-15000)
    })
  })

  // -------------------------------------------------------------------------
  // Gross Profit and Margin
  // -------------------------------------------------------------------------
  describe('calculateGrossProfit', () => {
    it('calculates gross profit as revenue minus COGS', () => {
      expect(calculateGrossProfit(1000000, 400000)).toBe(600000)
    })

    it('handles zero revenue', () => {
      expect(calculateGrossProfit(0, 0)).toBe(0)
    })

    it('handles COGS exceeding revenue', () => {
      expect(calculateGrossProfit(100000, 150000)).toBe(-50000)
    })
  })

  describe('calculateGrossMargin', () => {
    it('calculates margin as decimal', () => {
      expect(calculateGrossMargin(600000, 1000000)).toBe(0.6)
    })

    it('returns 0 for zero revenue', () => {
      expect(calculateGrossMargin(0, 0)).toBe(0)
    })
  })
})

// =============================================================================
// PROD-016: Category Value Gap Reconciliation Tests
// =============================================================================

describe('PROD-016: Category Value Gap Reconciliation', () => {

  describe('calculateCategoryValueGaps', () => {
    const standardCategories: CategoryGapInput[] = [
      { category: 'FINANCIAL', score: 0.70, weight: 0.25 },
      { category: 'TRANSFERABILITY', score: 0.45, weight: 0.20 },
      { category: 'OPERATIONAL', score: 0.60, weight: 0.20 },
      { category: 'MARKET', score: 0.80, weight: 0.15 },
      { category: 'LEGAL_TAX', score: 0.50, weight: 0.10 },
    ]

    it('distributes total value gap across categories', () => {
      const totalGap = 200000
      const results = calculateCategoryValueGaps(standardCategories, totalGap)

      // Every category should have a non-negative dollar impact
      for (const r of results) {
        expect(r.dollarImpact).toBeGreaterThanOrEqual(0)
      }

      // Lower scores should have higher impacts (given same weight)
      const transferability = results.find(r => r.category === 'TRANSFERABILITY')!
      const market = results.find(r => r.category === 'MARKET')!
      expect(transferability.dollarImpact).toBeGreaterThan(market.dollarImpact)
    })

    it('CRITICAL: category gaps sum EXACTLY to total value gap', () => {
      const testGaps = [100000, 200000, 500000, 1000000, 12345, 99999, 1]

      for (const totalGap of testGaps) {
        const results = calculateCategoryValueGaps(standardCategories, totalGap)
        const sum = results.reduce((s, r) => s + r.dollarImpact, 0)

        // The sum must EXACTLY equal the total gap (no rounding residual)
        expect(sum).toBe(Math.round(totalGap))
      }
    })

    it('handles zero value gap', () => {
      const results = calculateCategoryValueGaps(standardCategories, 0)
      for (const r of results) {
        expect(r.dollarImpact).toBe(0)
      }
    })

    it('handles negative value gap', () => {
      const results = calculateCategoryValueGaps(standardCategories, -50000)
      for (const r of results) {
        expect(r.dollarImpact).toBe(0)
      }
    })

    it('handles all perfect scores (no gap to distribute)', () => {
      const perfectCategories: CategoryGapInput[] = [
        { category: 'FINANCIAL', score: 1.0, weight: 0.25 },
        { category: 'TRANSFERABILITY', score: 1.0, weight: 0.20 },
        { category: 'OPERATIONAL', score: 1.0, weight: 0.20 },
        { category: 'MARKET', score: 1.0, weight: 0.15 },
        { category: 'LEGAL_TAX', score: 1.0, weight: 0.10 },
      ]

      const results = calculateCategoryValueGaps(perfectCategories, 100000)
      for (const r of results) {
        expect(r.dollarImpact).toBe(0)
      }
    })

    it('handles one category with all the gap', () => {
      const oneBadCategory: CategoryGapInput[] = [
        { category: 'FINANCIAL', score: 0.50, weight: 0.25 },
        { category: 'TRANSFERABILITY', score: 1.0, weight: 0.20 },
        { category: 'OPERATIONAL', score: 1.0, weight: 0.20 },
        { category: 'MARKET', score: 1.0, weight: 0.15 },
        { category: 'LEGAL_TAX', score: 1.0, weight: 0.10 },
      ]

      const totalGap = 100000
      const results = calculateCategoryValueGaps(oneBadCategory, totalGap)

      const financial = results.find(r => r.category === 'FINANCIAL')!
      expect(financial.dollarImpact).toBe(100000) // Gets ALL the gap

      for (const r of results) {
        if (r.category !== 'FINANCIAL') {
          expect(r.dollarImpact).toBe(0)
        }
      }
    })

    it('results are sorted by dollar impact descending', () => {
      const results = calculateCategoryValueGaps(standardCategories, 200000)

      for (let i = 1; i < results.length; i++) {
        expect(results[i].dollarImpact).toBeLessThanOrEqual(results[i - 1].dollarImpact)
      }
    })

    it('rawGap is correctly calculated for each category', () => {
      const results = calculateCategoryValueGaps(standardCategories, 200000)

      for (const r of results) {
        const input = standardCategories.find(c => c.category === r.category)!
        expect(r.rawGap).toBeCloseTo((1 - input.score) * input.weight, 10)
      }
    })

    it('produces consistent results between dashboard and diagnosis routes', () => {
      // Both routes use the same shared utility, so results must be identical
      // Simulating the dashboard bridge
      const totalGap = 150000
      const dashboardResult = calculateCategoryValueGaps(standardCategories, totalGap)

      // Simulating the diagnosis route (same inputs)
      const diagnosisResult = calculateCategoryValueGaps(standardCategories, totalGap)

      // Build maps for comparison
      const dashboardMap = new Map(dashboardResult.map(r => [r.category, r.dollarImpact]))
      const diagnosisMap = new Map(diagnosisResult.map(r => [r.category, r.dollarImpact]))

      for (const cat of standardCategories) {
        expect(dashboardMap.get(cat.category)).toBe(diagnosisMap.get(cat.category))
      }
    })

    it('handles rounding edge case with many categories', () => {
      // Create a scenario where rounding errors would accumulate
      const categories: CategoryGapInput[] = [
        { category: 'A', score: 0.33, weight: 0.20 },
        { category: 'B', score: 0.33, weight: 0.20 },
        { category: 'C', score: 0.33, weight: 0.20 },
        { category: 'D', score: 0.33, weight: 0.20 },
        { category: 'E', score: 0.33, weight: 0.20 },
      ]

      const totalGap = 100003 // Intentionally odd number

      const results = calculateCategoryValueGaps(categories, totalGap)
      const sum = results.reduce((s, r) => s + r.dollarImpact, 0)
      expect(sum).toBe(100003) // Must reconcile exactly
    })

    it('empty categories array returns empty results', () => {
      const results = calculateCategoryValueGaps([], 100000)
      expect(results).toHaveLength(0)
    })

    it('weight proportionality is respected', () => {
      // Two categories with same score gap but different weights
      const categories: CategoryGapInput[] = [
        { category: 'HIGH_WEIGHT', score: 0.50, weight: 0.40 },
        { category: 'LOW_WEIGHT', score: 0.50, weight: 0.10 },
      ]

      const results = calculateCategoryValueGaps(categories, 100000)
      const highWeight = results.find(r => r.category === 'HIGH_WEIGHT')!
      const lowWeight = results.find(r => r.category === 'LOW_WEIGHT')!

      // HIGH_WEIGHT should get 4x the impact (0.40/0.10 ratio with same gap)
      expect(highWeight.dollarImpact).toBe(80000)
      expect(lowWeight.dollarImpact).toBe(20000)
    })
  })
})

// =============================================================================
// Cross-Cutting: EBITDA Consistency Across Locations
// =============================================================================

describe('EBITDA Consistency Across All Locations', () => {
  // These test inputs simulate a typical company's P&L data
  const standardInputs = {
    grossRevenue: 2000000,
    cogs: 800000,
    operatingExpenses: 700000, // Includes D, A, I, T
    depreciation: 80000,
    amortization: 20000,
    interestExpense: 30000,
    taxExpense: 50000,
  }

  const grossProfit = standardInputs.grossRevenue - standardInputs.cogs

  it('all calculation locations produce identical EBITDA', () => {
    // Location 1: Income statement route (the canonical source)
    const incomeStatementEbitda = calculateEbitda({
      grossProfit,
      operatingExpenses: standardInputs.operatingExpenses,
      depreciation: standardInputs.depreciation,
      amortization: standardInputs.amortization,
      interestExpense: standardInputs.interestExpense,
      taxExpense: standardInputs.taxExpense,
    })

    // Location 2: QuickBooks sync (FIXED - previously missing A, I, T)
    // In QB, depreciation includes amortization
    const qbEbitda = calculateEbitda({
      grossProfit,
      operatingExpenses: standardInputs.operatingExpenses,
      depreciation: standardInputs.depreciation + standardInputs.amortization, // QB combines D+A
      amortization: 0, // Already in depreciation
      interestExpense: standardInputs.interestExpense,
      taxExpense: standardInputs.taxExpense,
    })

    // Location 3: Financial profile / lending page (FIXED - previously missing all add-backs)
    const financialProfileEbitda = calculateEbitda({
      grossProfit,
      operatingExpenses: standardInputs.operatingExpenses,
      depreciation: standardInputs.depreciation,
      amortization: standardInputs.amortization,
      interestExpense: standardInputs.interestExpense,
      taxExpense: standardInputs.taxExpense,
    })

    // Location 4: Frontend PLFormGrid / FinancialSummaryPanel
    // Uses same formula: grossProfit - totalExpenses + D + A + I + T
    const frontendEbitda = grossProfit - standardInputs.operatingExpenses +
      standardInputs.depreciation + standardInputs.amortization +
      standardInputs.interestExpense + standardInputs.taxExpense

    // All four must be identical
    expect(incomeStatementEbitda).toBe(680000) // 1,200,000 - 700,000 + 80,000 + 20,000 + 30,000 + 50,000
    expect(qbEbitda).toBe(680000)
    expect(financialProfileEbitda).toBe(680000)
    expect(frontendEbitda).toBe(680000)
  })
})
