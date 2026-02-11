/**
 * Material Change Detector (PROD-017)
 *
 * Detects significant business changes that warrant immediate re-assessment:
 * 1. Revenue changed >20% since last assessment
 * 2. New QuickBooks/accounting sync since last assessment
 * 3. High-impact task completed (rawImpact > threshold)
 *
 * Returns a boolean + human-readable description of what changed.
 */

import { prisma } from '@/lib/prisma'
import type { BriCategory } from '@prisma/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaterialChange {
  detected: boolean
  changes: MaterialChangeDetail[]
  description: string
}

export interface MaterialChangeDetail {
  type: 'REVENUE_SHIFT' | 'NEW_SYNC' | 'HIGH_IMPACT_TASK'
  description: string
  magnitude?: number // e.g., 0.25 for 25% revenue change
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const MATERIAL_CHANGE_CONFIG = {
  /** Revenue change threshold (20%) */
  REVENUE_CHANGE_THRESHOLD: 0.20,
  /** Minimum raw impact for a task to be "high impact" */
  HIGH_IMPACT_TASK_THRESHOLD: 50000,
} as const

// ---------------------------------------------------------------------------
// Detector (DB-backed)
// ---------------------------------------------------------------------------

/**
 * Detect material changes for a specific BRI category since its last assessment.
 *
 * @param companyId - The company to check
 * @param categoryId - The BRI category (e.g., 'FINANCIAL')
 * @param lastAssessedAt - When this category was last assessed (null = never)
 */
export async function detectMaterialChanges(
  companyId: string,
  categoryId: string,
  lastAssessedAt: Date | null,
): Promise<MaterialChange> {
  const sinceDate = lastAssessedAt ?? new Date(0) // If never assessed, check all time
  const changes: MaterialChangeDetail[] = []

  // 1. Revenue shift >20%
  const revenueChange = await detectRevenueShift(companyId, sinceDate)
  if (revenueChange) {
    changes.push(revenueChange)
  }

  // 2. New accounting sync
  const syncChange = await detectNewSync(companyId, sinceDate)
  if (syncChange) {
    changes.push(syncChange)
  }

  // 3. High-impact task completed in this category
  const taskChange = await detectHighImpactTaskCompletion(
    companyId,
    categoryId,
    sinceDate,
  )
  if (taskChange) {
    changes.push(taskChange)
  }

  if (changes.length === 0) {
    return {
      detected: false,
      changes: [],
      description: 'No material changes detected',
    }
  }

  // Build a human-readable summary
  const descriptions = changes.map(c => c.description)
  const description = descriptions.length === 1
    ? descriptions[0]
    : `Multiple changes detected: ${descriptions.join('; ')}`

  return {
    detected: true,
    changes,
    description,
  }
}

/**
 * Detect material changes across ALL categories for a company.
 * Returns a Map of categoryId -> MaterialChange.
 */
export async function detectAllMaterialChanges(
  companyId: string,
  categoryAssessmentDates: Map<string, Date | null>,
): Promise<Map<string, MaterialChange>> {
  const results = new Map<string, MaterialChange>()

  // Revenue and sync changes are company-wide, not category-specific
  // Compute them once, then share across categories
  const earliestDate = getEarliestDate(categoryAssessmentDates)
  const revenueChange = await detectRevenueShift(companyId, earliestDate)
  const syncChange = await detectNewSync(companyId, earliestDate)

  for (const [categoryId, lastAssessedAt] of categoryAssessmentDates) {
    const sinceDate = lastAssessedAt ?? new Date(0)
    const changes: MaterialChangeDetail[] = []

    // Company-wide changes apply if this category was assessed before the change
    if (revenueChange && (!lastAssessedAt || lastAssessedAt < new Date())) {
      changes.push(revenueChange)
    }
    if (syncChange && (!lastAssessedAt || lastAssessedAt < new Date())) {
      changes.push(syncChange)
    }

    // Category-specific: high-impact task
    const taskChange = await detectHighImpactTaskCompletion(
      companyId,
      categoryId,
      sinceDate,
    )
    if (taskChange) {
      changes.push(taskChange)
    }

    if (changes.length === 0) {
      results.set(categoryId, {
        detected: false,
        changes: [],
        description: 'No material changes detected',
      })
    } else {
      const descriptions = changes.map(c => c.description)
      results.set(categoryId, {
        detected: true,
        changes,
        description: descriptions.length === 1
          ? descriptions[0]
          : `Multiple changes: ${descriptions.join('; ')}`,
      })
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Individual detectors
// ---------------------------------------------------------------------------

/**
 * Check if company revenue changed >20% since a given date.
 * Compares the two most recent valuation snapshots.
 */
async function detectRevenueShift(
  companyId: string,
  sinceDate: Date,
): Promise<MaterialChangeDetail | null> {
  const snapshots = await prisma.valuationSnapshot.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: {
      createdAt: true,
      currentValue: true,
      adjustedEbitda: true,
    },
  })

  if (snapshots.length < 2) return null

  const [latest, previous] = snapshots

  // Only consider if the latest snapshot was created after sinceDate
  if (latest.createdAt <= sinceDate) return null

  const latestEbitda = Number(latest.adjustedEbitda)
  const previousEbitda = Number(previous.adjustedEbitda)

  if (previousEbitda === 0) return null

  const changePct = Math.abs(latestEbitda - previousEbitda) / Math.abs(previousEbitda)

  if (changePct >= MATERIAL_CHANGE_CONFIG.REVENUE_CHANGE_THRESHOLD) {
    const direction = latestEbitda > previousEbitda ? 'increased' : 'decreased'
    const pctFormatted = Math.round(changePct * 100)
    return {
      type: 'REVENUE_SHIFT',
      description: `Adjusted EBITDA ${direction} by ${pctFormatted}% — re-assess to update your scores`,
      magnitude: changePct,
    }
  }

  return null
}

/**
 * Check if a new accounting integration sync completed since a given date.
 */
async function detectNewSync(
  companyId: string,
  sinceDate: Date,
): Promise<MaterialChangeDetail | null> {
  const recentSync = await prisma.integration.findFirst({
    where: {
      companyId,
      lastSyncAt: { gt: sinceDate },
      lastSyncStatus: 'SUCCESS',
    },
    orderBy: { lastSyncAt: 'desc' },
    select: {
      provider: true,
      lastSyncAt: true,
    },
  })

  if (!recentSync || !recentSync.lastSyncAt) return null

  return {
    type: 'NEW_SYNC',
    description: `New ${recentSync.provider} sync completed — your financial data has been updated`,
  }
}

/**
 * Check if a high-impact task was completed in this category since last assessment.
 */
async function detectHighImpactTaskCompletion(
  companyId: string,
  categoryId: string,
  sinceDate: Date,
): Promise<MaterialChangeDetail | null> {
  const highImpactTask = await prisma.task.findFirst({
    where: {
      companyId,
      briCategory: categoryId as BriCategory,
      status: 'COMPLETED',
      completedAt: { gt: sinceDate },
      rawImpact: { gte: MATERIAL_CHANGE_CONFIG.HIGH_IMPACT_TASK_THRESHOLD },
    },
    orderBy: { rawImpact: 'desc' },
    select: {
      title: true,
      rawImpact: true,
    },
  })

  if (!highImpactTask) return null

  const impact = Number(highImpactTask.rawImpact)
  const formatted = impact >= 1000
    ? `$${Math.round(impact / 1000)}K`
    : `$${Math.round(impact)}`

  return {
    type: 'HIGH_IMPACT_TASK',
    description: `Completed "${highImpactTask.title}" (${formatted} impact) — re-assess to capture the improvement`,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEarliestDate(dates: Map<string, Date | null>): Date {
  let earliest = new Date()
  for (const date of dates.values()) {
    if (date && date < earliest) {
      earliest = date
    }
  }
  return earliest
}
