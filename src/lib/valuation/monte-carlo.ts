// Monte Carlo Simulation Engine for DCF Valuation
// Runs probabilistic simulations to generate valuation ranges

import { calculateDCF, type DCFInputs } from './dcf-calculator'

export interface MonteCarloInputs {
  baseInputs: DCFInputs
  waccStdDev: number // Standard deviation for WACC (e.g., 0.01 for 1%)
  growthStdDev: number // Standard deviation for each growth rate
  terminalGrowthStdDev: number // Standard deviation for terminal growth
  iterations: number
  finalEBITDA?: number
}

export interface MonteCarloResults {
  simulations: number[]
  mean: number
  median: number
  standardDeviation: number
  percentile25: number
  percentile75: number
  percentile5: number
  percentile95: number
  min: number
  max: number
  histogram: HistogramBin[]
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
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(avgSquaredDiff)
}

/**
 * Generate histogram bins
 */
function generateHistogram(values: number[], binCount: number = 20): HistogramBin[] {
  if (values.length === 0) return []

  const min = Math.min(...values)
  const max = Math.max(...values)
  const binWidth = (max - min) / binCount

  const bins: HistogramBin[] = []

  for (let i = 0; i < binCount; i++) {
    const binMin = min + i * binWidth
    const binMax = min + (i + 1) * binWidth

    const count = values.filter((v) => {
      if (i === binCount - 1) {
        return v >= binMin && v <= binMax
      }
      return v >= binMin && v < binMax
    }).length

    bins.push({
      min: binMin,
      max: binMax,
      count,
      percentage: (count / values.length) * 100,
    })
  }

  return bins
}

/**
 * Run a single Monte Carlo iteration
 */
function runSingleIteration(
  baseInputs: DCFInputs,
  waccStdDev: number,
  growthStdDev: number,
  terminalGrowthStdDev: number,
  finalEBITDA?: number
): number | null {
  // Sample WACC (ensure it stays positive and reasonable)
  const sampledWACC = clamp(
    randomNormal(baseInputs.wacc, waccStdDev),
    0.05, // Min 5%
    0.25 // Max 25%
  )

  // Sample growth rates
  const sampledGrowthRates = baseInputs.growthRates.map((rate) =>
    clamp(
      randomNormal(rate, growthStdDev),
      -0.2, // Min -20%
      0.3 // Max 30%
    )
  )

  // Sample terminal growth rate
  const sampledTerminalGrowth = clamp(
    randomNormal(baseInputs.perpetualGrowthRate, terminalGrowthStdDev),
    0.005, // Min 0.5%
    sampledWACC - 0.01 // Must be less than WACC
  )

  // Create inputs for this iteration
  const iterationInputs: DCFInputs = {
    ...baseInputs,
    wacc: sampledWACC,
    growthRates: sampledGrowthRates,
    perpetualGrowthRate: sampledTerminalGrowth,
  }

  try {
    const result = calculateDCF(iterationInputs, finalEBITDA)
    // Filter out unreasonable results
    if (result.enterpriseValue > 0 && result.enterpriseValue < baseInputs.baseFCF * 1000) {
      return result.enterpriseValue
    }
    return null
  } catch {
    return null
  }
}

/**
 * Run Monte Carlo simulation with chunked processing to avoid blocking
 */
export async function runMonteCarloSimulation(
  inputs: MonteCarloInputs,
  onProgress?: (progress: number) => void
): Promise<MonteCarloResults> {
  const { baseInputs, waccStdDev, growthStdDev, terminalGrowthStdDev, iterations, finalEBITDA } =
    inputs

  const simulations: number[] = []
  const chunkSize = 500 // Process in chunks to avoid blocking UI

  for (let i = 0; i < iterations; i += chunkSize) {
    // Process chunk
    const chunkEnd = Math.min(i + chunkSize, iterations)

    for (let j = i; j < chunkEnd; j++) {
      const result = runSingleIteration(
        baseInputs,
        waccStdDev,
        growthStdDev,
        terminalGrowthStdDev,
        finalEBITDA
      )

      if (result !== null) {
        simulations.push(result)
      }
    }

    // Report progress and yield to event loop
    if (onProgress) {
      onProgress(chunkEnd / iterations)
    }

    // Yield to event loop between chunks
    if (chunkEnd < iterations) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
    }
  }

  // Calculate statistics
  const sortedSimulations = [...simulations].sort((a, b) => a - b)
  const mean = simulations.reduce((a, b) => a + b, 0) / simulations.length
  const median = percentile(sortedSimulations, 50)
  const standardDeviation = calculateStdDev(simulations, mean)
  const histogram = generateHistogram(simulations, 25)

  return {
    simulations,
    mean,
    median,
    standardDeviation,
    percentile25: percentile(sortedSimulations, 25),
    percentile75: percentile(sortedSimulations, 75),
    percentile5: percentile(sortedSimulations, 5),
    percentile95: percentile(sortedSimulations, 95),
    min: sortedSimulations[0] || 0,
    max: sortedSimulations[sortedSimulations.length - 1] || 0,
    histogram,
  }
}

/**
 * Synchronous Monte Carlo for smaller iteration counts
 */
export function runMonteCarloSync(inputs: MonteCarloInputs): MonteCarloResults {
  const { baseInputs, waccStdDev, growthStdDev, terminalGrowthStdDev, iterations, finalEBITDA } =
    inputs

  const simulations: number[] = []

  for (let i = 0; i < iterations; i++) {
    const result = runSingleIteration(
      baseInputs,
      waccStdDev,
      growthStdDev,
      terminalGrowthStdDev,
      finalEBITDA
    )

    if (result !== null) {
      simulations.push(result)
    }
  }

  // Calculate statistics
  const sortedSimulations = [...simulations].sort((a, b) => a - b)
  const mean = simulations.length > 0 ? simulations.reduce((a, b) => a + b, 0) / simulations.length : 0
  const median = percentile(sortedSimulations, 50)
  const standardDeviation = calculateStdDev(simulations, mean)
  const histogram = generateHistogram(simulations, 25)

  return {
    simulations,
    mean,
    median,
    standardDeviation,
    percentile25: percentile(sortedSimulations, 25),
    percentile75: percentile(sortedSimulations, 75),
    percentile5: percentile(sortedSimulations, 5),
    percentile95: percentile(sortedSimulations, 95),
    min: sortedSimulations[0] || 0,
    max: sortedSimulations[sortedSimulations.length - 1] || 0,
    histogram,
  }
}
