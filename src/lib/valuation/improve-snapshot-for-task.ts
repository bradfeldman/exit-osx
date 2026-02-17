/**
 * Direct BRI Impact for Onboarding Tasks
 *
 * When an onboarding task (no linkedQuestionId) is completed,
 * directly improve the BRI category score and create a new snapshot.
 */

import { prisma } from '@/lib/prisma'
import { BriCategory } from '@prisma/client'
import { ALPHA, calculateValuation } from './calculate-valuation'
import { DEFAULT_CATEGORY_WEIGHTS } from './bri-scoring'

// BRI category field mapping
const BRI_CATEGORY_FIELDS: Record<string, string> = {
  FINANCIAL: 'briFinancial',
  TRANSFERABILITY: 'briTransferability',
  OPERATIONAL: 'briOperational',
  MARKET: 'briMarket',
  LEGAL_TAX: 'briLegalTax',
  PERSONAL: 'briPersonal',
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
  actualValueIncrease?: number
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

    // Use the SAME industry multiples from the existing snapshot
    // This ensures valuation changes only due to BRI improvement, not different multiples
    const adjustedEbitda = Number(latestSnapshot.adjustedEbitda)
    const coreScore = Number(latestSnapshot.coreScore)
    const industryMultipleLow = Number(latestSnapshot.industryMultipleLow)
    const industryMultipleHigh = Number(latestSnapshot.industryMultipleHigh)

    // Use shared utility for consistent valuation calculation
    const valuation = calculateValuation({
      adjustedEbitda,
      industryMultipleLow,
      industryMultipleHigh,
      coreScore,
      briScore: newBriScore,
    })

    const { baseMultiple, finalMultiple, discountFraction, currentValue, potentialValue, valueGap } = valuation

    // Calculate the ACTUAL dollar increase from this task completion
    const previousCurrentValue = Number(latestSnapshot.currentValue)
    const actualValueIncrease = Math.round(currentValue - previousCurrentValue)

    // Carry forward DCF fields from previous snapshot (DCF is independent of BRI)
    const dcfCarryForward: Record<string, unknown> = {}
    if (latestSnapshot.dcfEnterpriseValue != null) {
      dcfCarryForward.dcfEnterpriseValue = latestSnapshot.dcfEnterpriseValue
      dcfCarryForward.dcfEquityValue = latestSnapshot.dcfEquityValue
      dcfCarryForward.dcfWacc = latestSnapshot.dcfWacc
      dcfCarryForward.dcfBaseFcf = latestSnapshot.dcfBaseFcf
      dcfCarryForward.dcfGrowthRates = latestSnapshot.dcfGrowthRates
      dcfCarryForward.dcfTerminalMethod = latestSnapshot.dcfTerminalMethod
      dcfCarryForward.dcfPerpetualGrowthRate = latestSnapshot.dcfPerpetualGrowthRate
      dcfCarryForward.dcfNetDebt = latestSnapshot.dcfNetDebt
      dcfCarryForward.dcfImpliedMultiple = latestSnapshot.dcfImpliedMultiple
      dcfCarryForward.dcfSource = latestSnapshot.dcfSource
    }

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
        ...dcfCarryForward,
      },
    })

    // Update the task's rawImpact to reflect the ACTUAL value increase
    // This ensures "recovered" counters match the real currentValue change
    if (actualValueIncrease > 0) {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          rawImpact: actualValueIncrease,
          normalizedValue: actualValueIncrease,
        },
      })
    }

    console.log(`[ONBOARDING_TASK] Improved ${task.briCategory} score: ${currentCategoryScore.toFixed(3)} → ${newCategoryScore.toFixed(3)} (BRI: ${Number(latestSnapshot.briScore).toFixed(3)} → ${newBriScore.toFixed(3)}, Value: $${previousCurrentValue.toFixed(0)} → $${currentValue.toFixed(0)}, actual +$${actualValueIncrease})`)

    return {
      success: true,
      snapshotId: newSnapshot.id,
      previousBriScore: Number(latestSnapshot.briScore),
      newBriScore,
      categoryImproved: task.briCategory,
      categoryPreviousScore: currentCategoryScore,
      categoryNewScore: newCategoryScore,
      actualValueIncrease,
    }
  } catch (error) {
    console.error('Error improving snapshot for onboarding task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
