// Monte Carlo Simulation for Retirement Planning
// Runs probabilistic simulations to determine retirement success probability

import {
  type RetirementAsset,
  type RetirementAssumptions,
  calculateTotalAfterTaxValue,
} from './retirement-calculator'

export interface RetirementMonteCarloInputs {
  assets: RetirementAsset[]
  assumptions: RetirementAssumptions
  returnStdDev: number // Standard deviation for returns (e.g., 0.15 for 15%)
  inflationStdDev: number // Standard deviation for inflation (e.g., 0.01 for 1%)
  iterations: number
}

export interface RetirementMonteCarloResults {
  successRate: number // Percentage of simulations where money lasted
  medianEndingBalance: number
  percentile10EndingBalance: number
  percentile90EndingBalance: number
  medianYearsLasted: number
  avgEndingBalance: number
  histogram: HistogramBin[]
  yearlySuccessRates: { year: number; successRate: number }[]
  simulations: SimulationResult[]
}

export interface SimulationResult {
  endingBalance: number
  yearsLasted: number
  ranOutOfMoney: boolean
}

export interface HistogramBin {
  min: number
  max: number
  count: number
  percentage: number
}

/**
 * Box-Muller transform to generate normally distributed random numbers
 */
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
  return z0 * stdDev + mean
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0
  const index = (p / 100) * (sortedArr.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedArr[lower]
  return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower)
}

/**
 * Generate histogram bins
 */
function generateHistogram(values: number[], binCount: number = 20): HistogramBin[] {
  if (values.length === 0) return []

  // Filter out extreme outliers for better visualization
  const sortedValues = [...values].sort((a, b) => a - b)
  const p5 = percentile(sortedValues, 5)
  const p95 = percentile(sortedValues, 95)
  const filteredValues = values.filter((v) => v >= p5 * 0.5 && v <= p95 * 1.5)

  if (filteredValues.length === 0) return []

  const min = Math.min(...filteredValues)
  const max = Math.max(...filteredValues)
  const binWidth = (max - min) / binCount

  if (binWidth === 0) return []

  const bins: HistogramBin[] = []

  for (let i = 0; i < binCount; i++) {
    const binMin = min + i * binWidth
    const binMax = min + (i + 1) * binWidth

    const count = filteredValues.filter((v) => {
      if (i === binCount - 1) {
        return v >= binMin && v <= binMax
      }
      return v >= binMin && v < binMax
    }).length

    bins.push({
      min: binMin,
      max: binMax,
      count,
      percentage: (count / filteredValues.length) * 100,
    })
  }

  return bins
}

/**
 * Run a single retirement simulation
 */
function runSingleSimulation(
  startingBalance: number,
  assumptions: RetirementAssumptions,
  returnStdDev: number,
  inflationStdDev: number
): SimulationResult {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    annualSpendingNeeds,
    inflationRate,
    growthRate,
    socialSecurityMonthly,
    otherIncomeMonthly,
  } = assumptions

  const yearsToRetirement = Math.max(0, retirementAge - currentAge)
  const yearsInRetirement = Math.max(0, lifeExpectancy - retirementAge)
  const totalYears = yearsToRetirement + yearsInRetirement

  let portfolioValue = startingBalance
  let annualSpending = annualSpendingNeeds
  const baseOtherIncome = (socialSecurityMonthly + otherIncomeMonthly) * 12

  // Accumulation phase
  for (let year = 0; year < yearsToRetirement; year++) {
    // Sample returns from normal distribution
    const actualReturn = clamp(randomNormal(growthRate, returnStdDev), -0.4, 0.5)
    const actualInflation = clamp(randomNormal(inflationRate, inflationStdDev), 0, 0.15)

    portfolioValue = portfolioValue * (1 + actualReturn)
    annualSpending *= 1 + actualInflation
  }

  // Retirement phase
  for (let year = 0; year < yearsInRetirement; year++) {
    // Sample returns and inflation from normal distribution
    const actualReturn = clamp(randomNormal(growthRate, returnStdDev), -0.4, 0.5)
    const actualInflation = clamp(randomNormal(inflationRate, inflationStdDev), 0, 0.15)

    // Withdrawal needed
    const otherIncome = baseOtherIncome * Math.pow(1 + actualInflation, year) // Assume other income grows with inflation
    const withdrawal = Math.max(0, annualSpending - otherIncome)

    // Apply return first, then withdraw
    portfolioValue = portfolioValue * (1 + actualReturn) - withdrawal
    annualSpending *= 1 + actualInflation

    if (portfolioValue <= 0) {
      return {
        endingBalance: 0,
        yearsLasted: yearsToRetirement + year + 1,
        ranOutOfMoney: true,
      }
    }
  }

  return {
    endingBalance: portfolioValue,
    yearsLasted: totalYears,
    ranOutOfMoney: false,
  }
}

/**
 * Run Monte Carlo simulation with chunked processing
 */
export async function runRetirementMonteCarloSimulation(
  inputs: RetirementMonteCarloInputs,
  onProgress?: (progress: number) => void
): Promise<RetirementMonteCarloResults> {
  const { assets, assumptions, returnStdDev, inflationStdDev, iterations } = inputs

  const startingBalance = calculateTotalAfterTaxValue(assets, assumptions)
  const simulations: SimulationResult[] = []
  const chunkSize = 500

  const yearsToRetirement = Math.max(0, assumptions.retirementAge - assumptions.currentAge)
  const yearsInRetirement = Math.max(0, assumptions.lifeExpectancy - assumptions.retirementAge)
  const yearlySuccessCounts: number[] = new Array(yearsInRetirement + 1).fill(0)

  for (let i = 0; i < iterations; i += chunkSize) {
    const chunkEnd = Math.min(i + chunkSize, iterations)

    for (let j = i; j < chunkEnd; j++) {
      const result = runSingleSimulation(
        startingBalance,
        assumptions,
        returnStdDev,
        inflationStdDev
      )
      simulations.push(result)

      // Track yearly success rates
      const retirementYearsLasted = result.yearsLasted - yearsToRetirement
      for (let year = 0; year <= yearsInRetirement; year++) {
        if (retirementYearsLasted >= year) {
          yearlySuccessCounts[year]++
        }
      }
    }

    if (onProgress) {
      onProgress(chunkEnd / iterations)
    }

    if (chunkEnd < iterations) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
  }

  // Calculate statistics
  const successfulSimulations = simulations.filter((s) => !s.ranOutOfMoney)
  const successRate = (successfulSimulations.length / simulations.length) * 100

  const endingBalances = simulations.map((s) => s.endingBalance)
  const sortedBalances = [...endingBalances].sort((a, b) => a - b)

  const yearsLastedValues = simulations.map((s) => s.yearsLasted)
  const sortedYears = [...yearsLastedValues].sort((a, b) => a - b)

  const avgEndingBalance = endingBalances.reduce((a, b) => a + b, 0) / endingBalances.length

  const yearlySuccessRates = yearlySuccessCounts.map((count, year) => ({
    year,
    successRate: (count / iterations) * 100,
  }))

  return {
    successRate,
    medianEndingBalance: percentile(sortedBalances, 50),
    percentile10EndingBalance: percentile(sortedBalances, 10),
    percentile90EndingBalance: percentile(sortedBalances, 90),
    medianYearsLasted: percentile(sortedYears, 50),
    avgEndingBalance,
    histogram: generateHistogram(endingBalances.filter((b) => b > 0), 25),
    yearlySuccessRates,
    simulations,
  }
}

/**
 * Synchronous version for smaller iteration counts
 */
export function runRetirementMonteCarloSync(
  inputs: RetirementMonteCarloInputs
): RetirementMonteCarloResults {
  const { assets, assumptions, returnStdDev, inflationStdDev, iterations } = inputs

  const startingBalance = calculateTotalAfterTaxValue(assets, assumptions)
  const simulations: SimulationResult[] = []

  const yearsToRetirement = Math.max(0, assumptions.retirementAge - assumptions.currentAge)
  const yearsInRetirement = Math.max(0, assumptions.lifeExpectancy - assumptions.retirementAge)
  const yearlySuccessCounts: number[] = new Array(yearsInRetirement + 1).fill(0)

  for (let i = 0; i < iterations; i++) {
    const result = runSingleSimulation(startingBalance, assumptions, returnStdDev, inflationStdDev)
    simulations.push(result)

    const retirementYearsLasted = result.yearsLasted - yearsToRetirement
    for (let year = 0; year <= yearsInRetirement; year++) {
      if (retirementYearsLasted >= year) {
        yearlySuccessCounts[year]++
      }
    }
  }

  const successfulSimulations = simulations.filter((s) => !s.ranOutOfMoney)
  const successRate = (successfulSimulations.length / simulations.length) * 100

  const endingBalances = simulations.map((s) => s.endingBalance)
  const sortedBalances = [...endingBalances].sort((a, b) => a - b)

  const yearsLastedValues = simulations.map((s) => s.yearsLasted)
  const sortedYears = [...yearsLastedValues].sort((a, b) => a - b)

  const avgEndingBalance = endingBalances.reduce((a, b) => a + b, 0) / endingBalances.length

  const yearlySuccessRates = yearlySuccessCounts.map((count, year) => ({
    year,
    successRate: (count / iterations) * 100,
  }))

  return {
    successRate,
    medianEndingBalance: percentile(sortedBalances, 50),
    percentile10EndingBalance: percentile(sortedBalances, 10),
    percentile90EndingBalance: percentile(sortedBalances, 90),
    medianYearsLasted: percentile(sortedYears, 50),
    avgEndingBalance,
    histogram: generateHistogram(endingBalances.filter((b) => b > 0), 25),
    yearlySuccessRates,
    simulations,
  }
}
