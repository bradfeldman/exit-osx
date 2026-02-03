/**
 * Direct BRI Impact for Onboarding Tasks
 *
 * When an onboarding task (no linkedQuestionId) is completed,
 * directly improve the BRI category score and create a new snapshot.
 */

import { prisma } from '@/lib/prisma'
import { BriCategory } from '@prisma/client'
import { getIndustryMultiples } from './industry-multiples'

// Alpha constant for non-linear discount calculation (matches recalculate-snapshot.ts)
const ALPHA = 1.4

// BRI category field mapping
const BRI_CATEGORY_FIELDS: Record<string, string> = {
  FINANCIAL: 'briFinancial',
  TRANSFERABILITY: 'briTransferability',
  OPERATIONAL: 'briOperational',
  MARKET: 'briMarket',
  LEGAL_TAX: 'briLegalTax',
  PERSONAL: 'briPersonal',
}

// Default category weights for BRI calculation
const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

interface TaskForImprovement {
  id: string
  companyId: string
  briCategory: string
  rawImpact: number | string | { toNumber(): number }
  title: string
}

export interface ImproveSnapshotResult {
  success: boolean
  snapshotId?: string
  error?: string
  previousBriScore?: number
  newBriScore?: number
  categoryImproved?: string
  categoryPreviousScore?: number
  categoryNewScore?: number
}

/**
 * Improve BRI score directly when an onboarding task is completed.
 * This is used for tasks that don't have a linkedQuestionId (not tied to assessment).
 */
export async function improveSnapshotForOnboardingTask(
  task: TaskForImprovement
): Promise<ImproveSnapshotResult> {
  try {
    // Get the latest snapshot for this company
    const latestSnapshot = await prisma.valuationSnapshot.findFirst({
      where: { companyId: task.companyId },
      orderBy: { createdAt: 'desc' },
    })

    if (!latestSnapshot) {
      return {
        success: false,
        error: 'No snapshot found for company',
      }
    }

    // Get company data for recalculation
    const company = await prisma.company.findUnique({
      where: { id: task.companyId },
      include: { coreFactors: true },
    })

    if (!company) {
      return {
        success: false,
        error: 'Company not found',
      }
    }

    // Calculate improvement for this category
    // Base improvement: 5-15% of the gap to perfect score (1.0)
    // Scaled by task value relative to total recoverable value
    const categoryField = BRI_CATEGORY_FIELDS[task.briCategory]
    if (!categoryField) {
      return {
        success: false,
        error: `Unknown BRI category: ${task.briCategory}`,
      }
    }

    const currentCategoryScore = Number(latestSnapshot[categoryField as keyof typeof latestSnapshot]) || 0
    const gapToClose = 1.0 - currentCategoryScore

    // Get all pending/in-progress tasks for this company to calculate relative impact
    const allTasks = await prisma.task.findMany({
      where: {
        companyId: task.companyId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
        briCategory: task.briCategory as BriCategory,
      },
      select: { rawImpact: true, status: true },
    })

    const totalCategoryValue = allTasks.reduce((sum, t) => sum + Number(t.rawImpact), 0)
    const taskValue = typeof task.rawImpact === 'object' && 'toNumber' in task.rawImpact
      ? task.rawImpact.toNumber()
      : Number(task.rawImpact)

    // Calculate improvement as proportion of task value to total category value
    // Multiplied by the gap available to improve
    // Minimum improvement: 5% of gap, Maximum: 25% of gap per task
    let improvementRatio = totalCategoryValue > 0 ? taskValue / totalCategoryValue : 0.1
    improvementRatio = Math.max(0.05, Math.min(0.25, improvementRatio))

    const improvement = gapToClose * improvementRatio
    const newCategoryScore = Math.min(1.0, currentCategoryScore + improvement)

    // Recalculate overall BRI score with the improved category
    const categoryScores: Record<string, number> = {
      FINANCIAL: Number(latestSnapshot.briFinancial),
      TRANSFERABILITY: Number(latestSnapshot.briTransferability),
      OPERATIONAL: Number(latestSnapshot.briOperational),
      MARKET: Number(latestSnapshot.briMarket),
      LEGAL_TAX: Number(latestSnapshot.briLegalTax),
      PERSONAL: Number(latestSnapshot.briPersonal),
    }
    categoryScores[task.briCategory] = newCategoryScore

    let newBriScore = 0
    for (const [category, score] of Object.entries(categoryScores)) {
      const weight = DEFAULT_CATEGORY_WEIGHTS[category] || 0
      newBriScore += score * weight
    }

    // Get industry multiples for valuation recalculation
    const multiples = await getIndustryMultiples(
      company.icbSubSector,
      company.icbSector,
      company.icbSuperSector,
      company.icbIndustry
    )

    // Recalculate valuation with new BRI score
    const adjustedEbitda = Number(latestSnapshot.adjustedEbitda)
    const coreScore = Number(latestSnapshot.coreScore)
    const industryMultipleLow = multiples.ebitdaMultipleLow
    const industryMultipleHigh = multiples.ebitdaMultipleHigh

    // Step 1: Core Score positions within industry range
    const baseMultiple = industryMultipleLow + coreScore * (industryMultipleHigh - industryMultipleLow)

    // Step 2: Non-linear discount based on NEW BRI
    const discountFraction = Math.pow(1 - newBriScore, ALPHA)

    // Step 3: Final multiple with floor guarantee
    const finalMultiple = industryMultipleLow + (baseMultiple - industryMultipleLow) * (1 - discountFraction)

    // Calculate new valuations
    const currentValue = adjustedEbitda * finalMultiple
    const potentialValue = adjustedEbitda * baseMultiple
    const valueGap = Math.max(0, potentialValue - currentValue)

    // Create new snapshot with improved scores
    const newSnapshot = await prisma.valuationSnapshot.create({
      data: {
        companyId: task.companyId,
        adjustedEbitda,
        industryMultipleLow,
        industryMultipleHigh,
        coreScore,
        briScore: newBriScore,
        briFinancial: categoryScores.FINANCIAL,
        briTransferability: categoryScores.TRANSFERABILITY,
        briOperational: categoryScores.OPERATIONAL,
        briMarket: categoryScores.MARKET,
        briLegalTax: categoryScores.LEGAL_TAX,
        briPersonal: categoryScores.PERSONAL,
        baseMultiple,
        discountFraction,
        finalMultiple,
        currentValue,
        potentialValue,
        valueGap,
        alphaConstant: ALPHA,
        snapshotReason: `Task completed: ${task.title}`,
      },
    })

    console.log(`[ONBOARDING_TASK] Improved ${task.briCategory} score: ${currentCategoryScore.toFixed(3)} → ${newCategoryScore.toFixed(3)} (BRI: ${Number(latestSnapshot.briScore).toFixed(3)} → ${newBriScore.toFixed(3)})`)

    return {
      success: true,
      snapshotId: newSnapshot.id,
      previousBriScore: Number(latestSnapshot.briScore),
      newBriScore,
      categoryImproved: task.briCategory,
      categoryPreviousScore: currentCategoryScore,
      categoryNewScore: newCategoryScore,
    }
  } catch (error) {
    console.error('Error improving snapshot for onboarding task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
