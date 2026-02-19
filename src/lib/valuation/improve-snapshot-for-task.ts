/**
 * V2 Snapshot Improvement for Task Completion
 *
 * Two distinct paths based on TaskNature:
 *
 * EVIDENCE tasks: Update DRS only. No EV change.
 *   - Improves the BRI category score (documentation/DD prep)
 *   - Recalculates Deal Readiness Score
 *   - Does NOT create a new snapshot or recalculate valuation
 *
 * IMPROVEMENT tasks: Full snapshot recalculation.
 *   - Business change that can affect BQS → valuation
 *   - Creates a new snapshot with updated BQS, risk discounts, EV range
 */

import { prisma } from '@/lib/prisma'
import { BriCategory } from '@prisma/client'
import { recalculateSnapshotForCompany } from './recalculate-snapshot'
import { calculateDealReadinessScore } from './deal-readiness-score'
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
  taskNature: 'EVIDENCE' | 'IMPROVEMENT'
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
  /** V2: Whether this was evidence-only (no EV change) */
  evidenceOnly?: boolean
  /** V2: Updated deal readiness score */
  dealReadinessScore?: number
  /** V2: DRS tier label */
  dealReadinessTier?: string
}

/**
 * Improve snapshot when a task is completed.
 *
 * V2 branching:
 * - EVIDENCE tasks → DRS-only update (no new snapshot, no EV change)
 * - IMPROVEMENT tasks → full snapshot recalculation via recalculateSnapshotForCompany
 */
export async function improveSnapshotForOnboardingTask(
  task: TaskForImprovement
): Promise<ImproveSnapshotResult> {
  try {
    if (task.taskNature === 'IMPROVEMENT') {
      return await handleImprovementTask(task)
    }
    // Default to evidence (safest path — no EV change)
    return await handleEvidenceTask(task)
  } catch (error) {
    console.error('Error improving snapshot for task:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * EVIDENCE task: Update DRS only. No EV change.
 *
 * Improves the BRI category score on the existing snapshot
 * and recalculates DRS. Does NOT create a new valuation snapshot.
 */
async function handleEvidenceTask(task: TaskForImprovement): Promise<ImproveSnapshotResult> {
  const latestSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId: task.companyId },
    orderBy: { createdAt: 'desc' },
  })

  if (!latestSnapshot) {
    return { success: false, error: 'No snapshot found for company' }
  }

  // Calculate category improvement
  const categoryField = BRI_CATEGORY_FIELDS[task.briCategory]
  if (!categoryField) {
    return { success: false, error: `Unknown BRI category: ${task.briCategory}` }
  }

  const currentCategoryScore = Number(latestSnapshot[categoryField as keyof typeof latestSnapshot]) || 0
  const gapToClose = 1.0 - currentCategoryScore

  // Get all tasks for this category to calculate relative impact
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

  // Calculate improvement (5-25% of gap)
  let improvementRatio = totalCategoryValue > 0 ? taskValue / totalCategoryValue : 0.1
  improvementRatio = Math.max(0.05, Math.min(0.25, improvementRatio))

  const improvement = gapToClose * improvementRatio
  const newCategoryScore = Math.min(1.0, currentCategoryScore + improvement)

  // Build category scores for DRS recalculation
  // CategoryScore requires totalPoints and earnedPoints — use score for both since
  // we only need the score field for DRS calculation
  const categoryScores = [
    { category: 'FINANCIAL', score: Number(latestSnapshot.briFinancial), totalPoints: 1, earnedPoints: Number(latestSnapshot.briFinancial) },
    { category: 'TRANSFERABILITY', score: Number(latestSnapshot.briTransferability), totalPoints: 1, earnedPoints: Number(latestSnapshot.briTransferability) },
    { category: 'OPERATIONAL', score: Number(latestSnapshot.briOperational), totalPoints: 1, earnedPoints: Number(latestSnapshot.briOperational) },
    { category: 'MARKET', score: Number(latestSnapshot.briMarket), totalPoints: 1, earnedPoints: Number(latestSnapshot.briMarket) },
    { category: 'LEGAL_TAX', score: Number(latestSnapshot.briLegalTax), totalPoints: 1, earnedPoints: Number(latestSnapshot.briLegalTax) },
  ]

  // Update the improved category
  const catIdx = categoryScores.findIndex(c => c.category === task.briCategory)
  if (catIdx >= 0) {
    categoryScores[catIdx].score = newCategoryScore
    categoryScores[catIdx].earnedPoints = newCategoryScore
  }

  // Recalculate overall BRI score
  const allCategoryScores: Record<string, number> = {
    FINANCIAL: Number(latestSnapshot.briFinancial),
    TRANSFERABILITY: Number(latestSnapshot.briTransferability),
    OPERATIONAL: Number(latestSnapshot.briOperational),
    MARKET: Number(latestSnapshot.briMarket),
    LEGAL_TAX: Number(latestSnapshot.briLegalTax),
    PERSONAL: Number(latestSnapshot.briPersonal),
  }
  allCategoryScores[task.briCategory] = newCategoryScore

  let newBriScore = 0
  for (const [category, score] of Object.entries(allCategoryScores)) {
    const weight = DEFAULT_CATEGORY_WEIGHTS[category] || 0
    newBriScore += score * weight
  }

  // Recalculate DRS with updated category scores
  const drsResult = calculateDealReadinessScore(categoryScores)

  // Update the existing snapshot's BRI category and DRS (but NOT EV fields)
  await prisma.valuationSnapshot.update({
    where: { id: latestSnapshot.id },
    data: {
      [categoryField]: newCategoryScore,
      briScore: newBriScore,
      dealReadinessScore: drsResult.score,
    },
  })

  // Update company's DRS
  await prisma.company.update({
    where: { id: task.companyId },
    data: {
      dealReadinessScore: drsResult.score,
      dealReadinessUpdatedAt: new Date(),
    },
  })

  console.log(`[EVIDENCE_TASK] ${task.briCategory}: ${currentCategoryScore.toFixed(3)} → ${newCategoryScore.toFixed(3)} | DRS: ${drsResult.score.toFixed(3)} (${drsResult.tier}) | NO EV CHANGE`)

  return {
    success: true,
    snapshotId: latestSnapshot.id,
    previousBriScore: Number(latestSnapshot.briScore),
    newBriScore,
    categoryImproved: task.briCategory,
    categoryPreviousScore: currentCategoryScore,
    categoryNewScore: newCategoryScore,
    actualValueIncrease: 0, // Evidence tasks never change EV
    evidenceOnly: true,
    dealReadinessScore: drsResult.score,
    dealReadinessTier: drsResult.tier,
  }
}

/**
 * IMPROVEMENT task: Full snapshot recalculation.
 *
 * Business changes (operational, institutionalize, risk reduction) can
 * affect BQS → quality-adjusted multiple → enterprise value.
 * Triggers a complete snapshot recalculation.
 */
async function handleImprovementTask(task: TaskForImprovement): Promise<ImproveSnapshotResult> {
  // Get pre-snapshot values for comparison
  const preSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId: task.companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      briScore: true,
      currentValue: true,
      evMid: true,
      briFinancial: true,
      briTransferability: true,
      briOperational: true,
      briMarket: true,
      briLegalTax: true,
      briPersonal: true,
    },
  })

  if (!preSnapshot) {
    return { success: false, error: 'No snapshot found for company' }
  }

  const previousEvMid = Number(preSnapshot.evMid || preSnapshot.currentValue)
  const previousBriScore = Number(preSnapshot.briScore)
  const previousCategoryScore = Number(
    preSnapshot[BRI_CATEGORY_FIELDS[task.briCategory] as keyof typeof preSnapshot] || 0
  )

  // Full recalculation creates a new snapshot with updated BQS, risk discounts, EV range
  const recalcResult = await recalculateSnapshotForCompany(
    task.companyId,
    `Improvement task completed: ${task.title}`
  )

  if (!recalcResult.success) {
    return {
      success: false,
      error: recalcResult.error || 'Snapshot recalculation failed',
    }
  }

  // Get post-snapshot values
  const postSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId: task.companyId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      briScore: true,
      currentValue: true,
      evMid: true,
      evLow: true,
      evHigh: true,
      dealReadinessScore: true,
    },
  })

  const newEvMid = Number(postSnapshot?.evMid || postSnapshot?.currentValue || 0)
  const actualValueIncrease = Math.round(newEvMid - previousEvMid)

  // Update the task's completed value range
  if (postSnapshot) {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        completedValueLow: Number(postSnapshot.evLow) - previousEvMid,
        completedValueHigh: Number(postSnapshot.evHigh) - previousEvMid,
      },
    })
  }

  console.log(`[IMPROVEMENT_TASK] ${task.briCategory}: EV ${previousEvMid.toFixed(0)} → ${newEvMid.toFixed(0)} (${actualValueIncrease >= 0 ? '+' : ''}${actualValueIncrease})`)

  return {
    success: true,
    snapshotId: postSnapshot?.id,
    previousBriScore,
    newBriScore: Number(postSnapshot?.briScore || 0),
    categoryImproved: task.briCategory,
    categoryPreviousScore: previousCategoryScore,
    categoryNewScore: previousCategoryScore, // recalc uses assessment, not direct bump
    actualValueIncrease,
    evidenceOnly: false,
    dealReadinessScore: Number(postSnapshot?.dealReadinessScore || 0),
  }
}
