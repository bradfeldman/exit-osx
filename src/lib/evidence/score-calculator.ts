import { EVIDENCE_CATEGORIES, type EvidenceCategory } from './evidence-categories'
import { getScoringDocsByCategory } from './expected-documents'

interface CategoryScore {
  category: EvidenceCategory
  documentsUploaded: number
  documentsExpected: number
  percentage: number
  dots: number
  weightedScore: number
}

/**
 * Calculate dots (0-5) based on document coverage ratio
 */
export function calculateDots(uploaded: number, expected: number): number {
  if (expected === 0) return 5
  const ratio = uploaded / expected
  if (ratio === 0) return 0
  if (ratio < 0.2) return 1
  if (ratio < 0.4) return 2
  if (ratio < 0.6) return 3
  if (ratio < 1.0) return 4
  return 5
}

/**
 * Calculate evidence score per category and overall
 */
export function calculateEvidenceScore(
  documentsByCategory: Record<EvidenceCategory, number>
): {
  totalPercentage: number
  totalUploaded: number
  totalExpected: number
  categories: CategoryScore[]
} {
  let totalWeightedScore = 0
  let totalUploaded = 0
  let totalExpected = 0
  const categories: CategoryScore[] = []

  for (const cat of EVIDENCE_CATEGORIES) {
    const scoringDocs = getScoringDocsByCategory(cat.id)
    const expected = scoringDocs.length
    const uploaded = Math.min(documentsByCategory[cat.id] ?? 0, expected)

    const percentage = expected > 0 ? Math.round((uploaded / expected) * 100) : 0
    const dots = calculateDots(uploaded, expected)
    const weightedScore = expected > 0 ? (uploaded / expected) * cat.weight * 100 : 0

    totalWeightedScore += weightedScore
    totalUploaded += uploaded
    totalExpected += expected

    categories.push({
      category: cat.id,
      documentsUploaded: uploaded,
      documentsExpected: expected,
      percentage,
      dots,
      weightedScore,
    })
  }

  return {
    totalPercentage: Math.min(Math.round(totalWeightedScore), 100),
    totalUploaded,
    totalExpected,
    categories,
  }
}
