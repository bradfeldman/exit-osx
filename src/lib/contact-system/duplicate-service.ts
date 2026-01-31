/**
 * Duplicate Service
 *
 * Manages batch duplicate detection and resolution operations.
 * Designed to run as background jobs or scheduled tasks.
 */

import { prisma } from '@/lib/prisma'
import {
  findDuplicateCompanies,
  findDuplicatePeople,
  mergeCompanies,
  mergePeople,
  type DuplicatePair,
} from './identity-resolution'
import type { CanonicalCompany, CanonicalPerson, DuplicateCandidate } from '@prisma/client'

// ============================================
// TYPES
// ============================================

export interface DuplicateDetectionResult {
  runId: string
  startedAt: Date
  completedAt: Date
  companiesScanned: number
  peopleScanned: number
  companyCandidatesFound: number
  personCandidatesFound: number
  newCandidatesSaved: number
  errors: string[]
}

export interface AutoMergeConfig {
  minConfidence: number        // Only auto-merge above this threshold (default: 0.98)
  maxMergesPerRun: number      // Safety limit (default: 50)
  dryRun: boolean              // Log what would happen without merging
  entityTypes: ('company' | 'person')[]
}

export interface AutoMergeResult {
  runId: string
  startedAt: Date
  completedAt: Date
  processed: number
  merged: number
  skipped: number
  errors: Array<{ candidateId: string; error: string }>
  dryRun: boolean
}

// ============================================
// BATCH DETECTION
// ============================================

/**
 * Run duplicate detection across all companies and people.
 * Saves new candidates to the database for review.
 */
export async function runDuplicateDetection(
  minConfidence: number = 0.70
): Promise<DuplicateDetectionResult> {
  const runId = `dup-${Date.now()}`
  const startedAt = new Date()
  const errors: string[] = []

  let companiesScanned = 0
  let peopleScanned = 0
  let companyCandidatesFound = 0
  let personCandidatesFound = 0
  let newCandidatesSaved = 0

  try {
    // Get counts for reporting
    companiesScanned = await prisma.canonicalCompany.count({
      where: { mergedIntoId: null },
    })
    peopleScanned = await prisma.canonicalPerson.count({
      where: { mergedIntoId: null },
    })

    // Find company duplicates
    let companyDuplicates: DuplicatePair<CanonicalCompany>[] = []
    try {
      companyDuplicates = await findDuplicateCompanies(minConfidence)
      companyCandidatesFound = companyDuplicates.length
    } catch (error) {
      errors.push(`Company detection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Find person duplicates
    let personDuplicates: DuplicatePair<CanonicalPerson>[] = []
    try {
      personDuplicates = await findDuplicatePeople(minConfidence)
      personCandidatesFound = personDuplicates.length
    } catch (error) {
      errors.push(`Person detection error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Save company candidates
    for (const dup of companyDuplicates) {
      try {
        const existing = await prisma.duplicateCandidate.findFirst({
          where: {
            entityType: 'COMPANY',
            status: 'PENDING',
            OR: [
              { companyAId: dup.entityA.id, companyBId: dup.entityB.id },
              { companyAId: dup.entityB.id, companyBId: dup.entityA.id },
            ],
          },
        })

        if (!existing) {
          await prisma.duplicateCandidate.create({
            data: {
              entityType: 'COMPANY',
              companyAId: dup.entityA.id,
              companyBId: dup.entityB.id,
              confidence: dup.confidence,
              matchReasons: dup.matchReasons,
              status: 'PENDING',
            },
          })
          newCandidatesSaved++
        }
      } catch (error) {
        errors.push(`Failed to save company candidate: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }

    // Save person candidates
    for (const dup of personDuplicates) {
      try {
        const existing = await prisma.duplicateCandidate.findFirst({
          where: {
            entityType: 'PERSON',
            status: 'PENDING',
            OR: [
              { personAId: dup.entityA.id, personBId: dup.entityB.id },
              { personAId: dup.entityB.id, personBId: dup.entityA.id },
            ],
          },
        })

        if (!existing) {
          await prisma.duplicateCandidate.create({
            data: {
              entityType: 'PERSON',
              personAId: dup.entityA.id,
              personBId: dup.entityB.id,
              confidence: dup.confidence,
              matchReasons: dup.matchReasons,
              status: 'PENDING',
            },
          })
          newCandidatesSaved++
        }
      } catch (error) {
        errors.push(`Failed to save person candidate: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  } catch (error) {
    errors.push(`Detection run error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  const completedAt = new Date()

  // Log the run
  await prisma.auditLog.create({
    data: {
      actorId: 'system',
      actorEmail: 'system@exitosx.com',
      action: 'DUPLICATE_DETECTION_RUN',
      targetType: 'System',
      targetId: runId,
      metadata: {
        runId,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        companiesScanned,
        peopleScanned,
        companyCandidatesFound,
        personCandidatesFound,
        newCandidatesSaved,
        errors,
      },
    },
  })

  return {
    runId,
    startedAt,
    completedAt,
    companiesScanned,
    peopleScanned,
    companyCandidatesFound,
    personCandidatesFound,
    newCandidatesSaved,
    errors,
  }
}

// ============================================
// AUTO-MERGE
// ============================================

const DEFAULT_AUTO_MERGE_CONFIG: AutoMergeConfig = {
  minConfidence: 0.98,
  maxMergesPerRun: 50,
  dryRun: false,
  entityTypes: ['company', 'person'],
}

/**
 * Auto-merge high-confidence duplicates.
 * Use with caution - only for very high confidence matches.
 */
export async function runAutoMerge(
  systemUserId: string,
  config: Partial<AutoMergeConfig> = {}
): Promise<AutoMergeResult> {
  const mergedConfig = { ...DEFAULT_AUTO_MERGE_CONFIG, ...config }
  const runId = `auto-merge-${Date.now()}`
  const startedAt = new Date()
  const errors: Array<{ candidateId: string; error: string }> = []

  let processed = 0
  let merged = 0
  let skipped = 0

  // Get high-confidence pending candidates
  const candidates = await prisma.duplicateCandidate.findMany({
    where: {
      status: 'PENDING',
      confidence: { gte: mergedConfig.minConfidence },
      entityType: {
        in: mergedConfig.entityTypes.map(t => t === 'company' ? 'COMPANY' : 'PERSON'),
      },
    },
    orderBy: { confidence: 'desc' },
    take: mergedConfig.maxMergesPerRun,
  })

  for (const candidate of candidates) {
    processed++

    try {
      if (mergedConfig.dryRun) {
        // Just log what would happen
        console.log(`[DRY RUN] Would merge ${candidate.entityType} candidate ${candidate.id} (confidence: ${candidate.confidence})`)
        skipped++
        continue
      }

      // Determine primary (newer data quality wins, or first created)
      if (candidate.entityType === 'COMPANY') {
        const companyA = await prisma.canonicalCompany.findUnique({
          where: { id: candidate.companyAId! },
        })
        const companyB = await prisma.canonicalCompany.findUnique({
          where: { id: candidate.companyBId! },
        })

        if (!companyA || !companyB) {
          skipped++
          continue
        }

        // Skip if either has been merged already
        if (companyA.mergedIntoId || companyB.mergedIntoId) {
          await prisma.duplicateCandidate.update({
            where: { id: candidate.id },
            data: {
              status: 'RESOLVED',
              resolution: 'SKIPPED',
              resolvedAt: new Date(),
              resolvedByUserId: systemUserId,
            },
          })
          skipped++
          continue
        }

        // Pick primary: prefer VERIFIED > ENRICHED > others, then earlier created
        const qualityOrder = { VERIFIED: 4, ENRICHED: 3, SUGGESTED: 2, PROVISIONAL: 1 }
        const primaryId =
          qualityOrder[companyA.dataQuality] > qualityOrder[companyB.dataQuality]
            ? companyA.id
            : qualityOrder[companyB.dataQuality] > qualityOrder[companyA.dataQuality]
            ? companyB.id
            : companyA.createdAt < companyB.createdAt
            ? companyA.id
            : companyB.id

        const duplicateId = primaryId === companyA.id ? companyB.id : companyA.id

        await mergeCompanies(primaryId, [duplicateId], systemUserId)
      } else {
        const personA = await prisma.canonicalPerson.findUnique({
          where: { id: candidate.personAId! },
        })
        const personB = await prisma.canonicalPerson.findUnique({
          where: { id: candidate.personBId! },
        })

        if (!personA || !personB) {
          skipped++
          continue
        }

        if (personA.mergedIntoId || personB.mergedIntoId) {
          await prisma.duplicateCandidate.update({
            where: { id: candidate.id },
            data: {
              status: 'RESOLVED',
              resolution: 'SKIPPED',
              resolvedAt: new Date(),
              resolvedByUserId: systemUserId,
            },
          })
          skipped++
          continue
        }

        const qualityOrder = { VERIFIED: 4, ENRICHED: 3, SUGGESTED: 2, PROVISIONAL: 1 }
        const primaryId =
          qualityOrder[personA.dataQuality] > qualityOrder[personB.dataQuality]
            ? personA.id
            : qualityOrder[personB.dataQuality] > qualityOrder[personA.dataQuality]
            ? personB.id
            : personA.createdAt < personB.createdAt
            ? personA.id
            : personB.id

        const duplicateId = primaryId === personA.id ? personB.id : personA.id

        await mergePeople(primaryId, [duplicateId], systemUserId)
      }

      // Update candidate status
      await prisma.duplicateCandidate.update({
        where: { id: candidate.id },
        data: {
          status: 'RESOLVED',
          resolution: 'MERGED',
          resolvedAt: new Date(),
          resolvedByUserId: systemUserId,
        },
      })

      merged++
    } catch (error) {
      errors.push({
        candidateId: candidate.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const completedAt = new Date()

  // Log the run
  await prisma.auditLog.create({
    data: {
      actorId: systemUserId,
      actorEmail: 'system@exitosx.com',
      action: 'AUTO_MERGE_RUN',
      targetType: 'System',
      targetId: runId,
      metadata: {
        runId,
        config: mergedConfig,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        processed,
        merged,
        skipped,
        errors,
      },
    },
  })

  return {
    runId,
    startedAt,
    completedAt,
    processed,
    merged,
    skipped,
    errors,
    dryRun: mergedConfig.dryRun,
  }
}

// ============================================
// CLEANUP
// ============================================

/**
 * Clean up stale duplicate candidates.
 * Removes candidates where one or both entities have been deleted/merged.
 */
export async function cleanupStaleCandidates(): Promise<{
  removed: number
  errors: string[]
}> {
  const errors: string[] = []
  let removed = 0

  // Find company candidates with missing entities
  const companyCandiates = await prisma.duplicateCandidate.findMany({
    where: {
      entityType: 'COMPANY',
      status: 'PENDING',
    },
  })

  for (const candidate of companyCandiates) {
    const companyA = candidate.companyAId
      ? await prisma.canonicalCompany.findUnique({
          where: { id: candidate.companyAId },
          select: { id: true, mergedIntoId: true },
        })
      : null

    const companyB = candidate.companyBId
      ? await prisma.canonicalCompany.findUnique({
          where: { id: candidate.companyBId },
          select: { id: true, mergedIntoId: true },
        })
      : null

    // Remove if either entity is missing or already merged
    if (!companyA || !companyB || companyA.mergedIntoId || companyB.mergedIntoId) {
      try {
        await prisma.duplicateCandidate.delete({ where: { id: candidate.id } })
        removed++
      } catch (error) {
        errors.push(`Failed to remove candidate ${candidate.id}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  // Find person candidates with missing entities
  const personCandidates = await prisma.duplicateCandidate.findMany({
    where: {
      entityType: 'PERSON',
      status: 'PENDING',
    },
  })

  for (const candidate of personCandidates) {
    const personA = candidate.personAId
      ? await prisma.canonicalPerson.findUnique({
          where: { id: candidate.personAId },
          select: { id: true, mergedIntoId: true },
        })
      : null

    const personB = candidate.personBId
      ? await prisma.canonicalPerson.findUnique({
          where: { id: candidate.personBId },
          select: { id: true, mergedIntoId: true },
        })
      : null

    if (!personA || !personB || personA.mergedIntoId || personB.mergedIntoId) {
      try {
        await prisma.duplicateCandidate.delete({ where: { id: candidate.id } })
        removed++
      } catch (error) {
        errors.push(`Failed to remove candidate ${candidate.id}: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }

  return { removed, errors }
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get duplicate resolution statistics.
 */
export async function getDuplicateStats(): Promise<{
  pending: { companies: number; people: number }
  resolved: { companies: number; people: number }
  avgConfidence: number
  oldestPending: Date | null
}> {
  const [pendingCounts, resolvedCounts, avgResult, oldestResult] = await Promise.all([
    prisma.duplicateCandidate.groupBy({
      by: ['entityType'],
      where: { status: 'PENDING' },
      _count: true,
    }),
    prisma.duplicateCandidate.groupBy({
      by: ['entityType'],
      where: { status: 'RESOLVED' },
      _count: true,
    }),
    prisma.duplicateCandidate.aggregate({
      where: { status: 'PENDING' },
      _avg: { confidence: true },
    }),
    prisma.duplicateCandidate.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ])

  const pending = { companies: 0, people: 0 }
  const resolved = { companies: 0, people: 0 }

  pendingCounts.forEach((c) => {
    if (c.entityType === 'COMPANY') pending.companies = c._count
    if (c.entityType === 'PERSON') pending.people = c._count
  })

  resolvedCounts.forEach((c) => {
    if (c.entityType === 'COMPANY') resolved.companies = c._count
    if (c.entityType === 'PERSON') resolved.people = c._count
  })

  return {
    pending,
    resolved,
    avgConfidence: avgResult._avg.confidence || 0,
    oldestPending: oldestResult?.createdAt || null,
  }
}
