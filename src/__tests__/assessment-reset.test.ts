/**
 * PROD-013: Assessment Reset & Zeroing Bug — Regression Tests
 *
 * Verifies that re-assessing one BRI category does NOT zero out other categories' scores.
 * Tests the pure scoring functions extracted into bri-scoring.ts.
 */
import { describe, it, expect } from 'vitest'
import {
  type ScoringResponse,
  deduplicateResponses,
  calculateCategoryScores,
  calculateWeightedBriScore,
  getCategoryScore,
  DEFAULT_CATEGORY_WEIGHTS,
  BRI_CATEGORIES,
} from '@/lib/valuation/bri-scoring'

// --- Test helpers ---

/** Create a ScoringResponse for a given category */
function makeResponse(
  questionId: string,
  briCategory: string,
  scoreValue: number,
  maxImpactPoints: number = 10,
  updatedAt: Date = new Date('2025-01-01'),
): ScoringResponse {
  return {
    questionId,
    briCategory,
    maxImpactPoints,
    scoreValue,
    hasOption: true,
    updatedAt,
  }
}

/** Create a NOT_APPLICABLE response (no option) */
function makeNotApplicable(
  questionId: string,
  briCategory: string,
  updatedAt: Date = new Date('2025-01-01'),
): ScoringResponse {
  return {
    questionId,
    briCategory,
    maxImpactPoints: 10,
    scoreValue: null,
    hasOption: false,
    updatedAt,
  }
}

/** Generate a full set of responses across all 6 categories (2 questions each) */
function makeFullAssessmentResponses(
  scores: Record<string, number>,
  baseDate: Date = new Date('2025-01-01'),
): ScoringResponse[] {
  const responses: ScoringResponse[] = []
  let questionCounter = 1

  for (const category of BRI_CATEGORIES) {
    const score = scores[category] ?? 0.5
    // Two questions per category
    responses.push(
      makeResponse(`q${questionCounter}`, category, score, 10, baseDate),
      makeResponse(`q${questionCounter + 1}`, category, score, 10, baseDate),
    )
    questionCounter += 2
  }
  return responses
}

// --- Tests ---

describe('PROD-013: Assessment Reset & Zeroing Bug', () => {
  describe('deduplicateResponses', () => {
    it('keeps the first occurrence when responses are pre-sorted by updatedAt desc', () => {
      const newer = makeResponse('q1', 'FINANCIAL', 0.8, 10, new Date('2025-02-01'))
      const older = makeResponse('q1', 'FINANCIAL', 0.5, 10, new Date('2025-01-01'))

      // Pre-sorted: newer first
      const deduped = deduplicateResponses([newer, older])

      expect(deduped.size).toBe(1)
      expect(deduped.get('q1')?.scoreValue).toBe(0.8)
    })

    it('keeps responses for different questions as separate entries', () => {
      const r1 = makeResponse('q1', 'FINANCIAL', 0.8)
      const r2 = makeResponse('q2', 'OPERATIONAL', 0.6)

      const deduped = deduplicateResponses([r1, r2])

      expect(deduped.size).toBe(2)
      expect(deduped.get('q1')?.scoreValue).toBe(0.8)
      expect(deduped.get('q2')?.scoreValue).toBe(0.6)
    })

    it('handles empty input', () => {
      const deduped = deduplicateResponses([])
      expect(deduped.size).toBe(0)
    })
  })

  describe('calculateCategoryScores', () => {
    it('calculates correct scores for a single category', () => {
      const responses = new Map<string, ScoringResponse>()
      responses.set('q1', makeResponse('q1', 'FINANCIAL', 0.8, 10))
      responses.set('q2', makeResponse('q2', 'FINANCIAL', 0.6, 10))

      const scores = calculateCategoryScores(responses)

      expect(scores).toHaveLength(1)
      expect(scores[0].category).toBe('FINANCIAL')
      // (10*0.8 + 10*0.6) / (10+10) = 14/20 = 0.7
      expect(scores[0].score).toBeCloseTo(0.7)
      expect(scores[0].totalPoints).toBe(20)
      expect(scores[0].earnedPoints).toBe(14)
    })

    it('calculates correct scores for multiple categories', () => {
      const responses = new Map<string, ScoringResponse>()
      responses.set('q1', makeResponse('q1', 'FINANCIAL', 0.8, 10))
      responses.set('q2', makeResponse('q2', 'OPERATIONAL', 1.0, 10))
      responses.set('q3', makeResponse('q3', 'MARKET', 0.5, 10))

      const scores = calculateCategoryScores(responses)

      expect(scores).toHaveLength(3)
      const financial = scores.find(s => s.category === 'FINANCIAL')
      const operational = scores.find(s => s.category === 'OPERATIONAL')
      const market = scores.find(s => s.category === 'MARKET')

      expect(financial?.score).toBe(0.8)
      expect(operational?.score).toBe(1.0)
      expect(market?.score).toBe(0.5)
    })

    it('skips NOT_APPLICABLE responses (hasOption=false)', () => {
      const responses = new Map<string, ScoringResponse>()
      responses.set('q1', makeResponse('q1', 'FINANCIAL', 0.8, 10))
      responses.set('q2', makeNotApplicable('q2', 'FINANCIAL'))

      const scores = calculateCategoryScores(responses)

      expect(scores).toHaveLength(1)
      expect(scores[0].category).toBe('FINANCIAL')
      // Only q1 counted
      expect(scores[0].score).toBe(0.8)
      expect(scores[0].totalPoints).toBe(10)
    })

    it('returns empty array when all responses are NOT_APPLICABLE', () => {
      const responses = new Map<string, ScoringResponse>()
      responses.set('q1', makeNotApplicable('q1', 'FINANCIAL'))
      responses.set('q2', makeNotApplicable('q2', 'OPERATIONAL'))

      const scores = calculateCategoryScores(responses)
      expect(scores).toHaveLength(0)
    })

    it('handles different maxImpactPoints weights correctly', () => {
      const responses = new Map<string, ScoringResponse>()
      // High-impact question with low score
      responses.set('q1', makeResponse('q1', 'FINANCIAL', 0.5, 20))
      // Low-impact question with high score
      responses.set('q2', makeResponse('q2', 'FINANCIAL', 1.0, 5))

      const scores = calculateCategoryScores(responses)
      // (20*0.5 + 5*1.0) / (20+5) = 15/25 = 0.6
      expect(scores[0].score).toBeCloseTo(0.6)
    })
  })

  describe('calculateWeightedBriScore', () => {
    it('calculates correct weighted score with default weights', () => {
      const scores = [
        { category: 'FINANCIAL', totalPoints: 10, earnedPoints: 8, score: 0.8 },
        { category: 'TRANSFERABILITY', totalPoints: 10, earnedPoints: 6, score: 0.6 },
        { category: 'OPERATIONAL', totalPoints: 10, earnedPoints: 7, score: 0.7 },
        { category: 'MARKET', totalPoints: 10, earnedPoints: 5, score: 0.5 },
        { category: 'LEGAL_TAX', totalPoints: 10, earnedPoints: 9, score: 0.9 },
        { category: 'PERSONAL', totalPoints: 10, earnedPoints: 4, score: 0.4 },
      ]

      const briScore = calculateWeightedBriScore(scores)

      // 0.8*0.25 + 0.6*0.20 + 0.7*0.20 + 0.5*0.15 + 0.9*0.10 + 0.4*0.10
      // = 0.200 + 0.120 + 0.140 + 0.075 + 0.090 + 0.040
      // = 0.665
      expect(briScore).toBeCloseTo(0.665)
    })

    it('returns 0 when no categories have scores', () => {
      const briScore = calculateWeightedBriScore([])
      expect(briScore).toBe(0)
    })

    it('uses partial scores when not all categories are present', () => {
      const scores = [
        { category: 'FINANCIAL', totalPoints: 10, earnedPoints: 10, score: 1.0 },
      ]

      const briScore = calculateWeightedBriScore(scores)
      // Only FINANCIAL contributes: 1.0 * 0.25 = 0.25
      expect(briScore).toBeCloseTo(0.25)
    })
  })

  describe('getCategoryScore', () => {
    it('returns score for an existing category', () => {
      const scores = [
        { category: 'FINANCIAL', totalPoints: 10, earnedPoints: 8, score: 0.8 },
      ]
      expect(getCategoryScore(scores, 'FINANCIAL')).toBe(0.8)
    })

    it('returns 0 for a category without responses', () => {
      const scores = [
        { category: 'FINANCIAL', totalPoints: 10, earnedPoints: 8, score: 0.8 },
      ]
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBe(0)
    })
  })

  // ======================================================================
  // CORE REGRESSION TESTS: The actual bug scenarios
  // ======================================================================

  describe('Regression: re-assessing one category preserves others', () => {
    it('assess category A then category B: category A score unchanged', () => {
      // Simulate: Assessment A has FINANCIAL responses (from first assessment)
      const financialResponses = [
        makeResponse('q1', 'FINANCIAL', 0.8, 10, new Date('2025-01-01')),
        makeResponse('q2', 'FINANCIAL', 0.6, 10, new Date('2025-01-01')),
      ]

      // Assessment B adds OPERATIONAL responses (from second assessment)
      const operationalResponses = [
        makeResponse('q3', 'OPERATIONAL', 0.9, 10, new Date('2025-02-01')),
        makeResponse('q4', 'OPERATIONAL', 0.7, 10, new Date('2025-02-01')),
      ]

      // All responses combined (sorted by updatedAt desc as the DB query does)
      const allResponses = [...operationalResponses, ...financialResponses]

      const deduped = deduplicateResponses(allResponses)
      const scores = calculateCategoryScores(deduped)

      const financialScore = getCategoryScore(scores, 'FINANCIAL')
      const operationalScore = getCategoryScore(scores, 'OPERATIONAL')

      // FINANCIAL should retain its score
      expect(financialScore).toBeCloseTo(0.7) // (0.8+0.6)/2
      // OPERATIONAL gets its new score
      expect(operationalScore).toBeCloseTo(0.8) // (0.9+0.7)/2
    })

    it('assess all 6 categories then re-assess FINANCIAL: other 5 unchanged', () => {
      // Step 1: Complete initial assessment (all 6 categories)
      const initialScores = {
        FINANCIAL: 0.6,
        TRANSFERABILITY: 0.7,
        OPERATIONAL: 0.8,
        MARKET: 0.5,
        LEGAL_TAX: 0.9,
        PERSONAL: 0.4,
      }
      const initialResponses = makeFullAssessmentResponses(
        initialScores,
        new Date('2025-01-01'),
      )

      // Step 2: Re-assess FINANCIAL only (newer timestamp, different score)
      const reassessedFinancial = [
        makeResponse('q1', 'FINANCIAL', 0.9, 10, new Date('2025-02-01')),
        makeResponse('q2', 'FINANCIAL', 0.85, 10, new Date('2025-02-01')),
      ]

      // Combine all responses sorted by updatedAt desc
      const allResponses = [
        ...reassessedFinancial,
        ...initialResponses,
      ]

      const deduped = deduplicateResponses(allResponses)
      const scores = calculateCategoryScores(deduped)

      // FINANCIAL should be updated to the new score
      expect(getCategoryScore(scores, 'FINANCIAL')).toBeCloseTo(0.875) // (0.9+0.85)/2

      // All other categories should retain their original scores
      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBeCloseTo(0.8)
      expect(getCategoryScore(scores, 'MARKET')).toBeCloseTo(0.5)
      expect(getCategoryScore(scores, 'LEGAL_TAX')).toBeCloseTo(0.9)
      expect(getCategoryScore(scores, 'PERSONAL')).toBeCloseTo(0.4)
    })

    it('re-assess category A three times: other 5 categories unchanged each time', () => {
      const initialScores = {
        FINANCIAL: 0.5,
        TRANSFERABILITY: 0.7,
        OPERATIONAL: 0.8,
        MARKET: 0.6,
        LEGAL_TAX: 0.9,
        PERSONAL: 0.4,
      }

      // Helper to simulate one round of reassessment
      function simulateReassessment(
        existingResponses: ScoringResponse[],
        newFinancialScore: number,
        timestamp: Date,
      ): ScoringResponse[] {
        const newFinancialResponses = [
          makeResponse('q1', 'FINANCIAL', newFinancialScore, 10, timestamp),
          makeResponse('q2', 'FINANCIAL', newFinancialScore, 10, timestamp),
        ]
        // Return all combined, sorted by updatedAt desc
        return [...newFinancialResponses, ...existingResponses]
      }

      // Round 0: initial assessment
      let allResponses = makeFullAssessmentResponses(initialScores, new Date('2025-01-01'))

      // Round 1: re-assess FINANCIAL to 0.7
      allResponses = simulateReassessment(allResponses, 0.7, new Date('2025-02-01'))
      let deduped = deduplicateResponses(allResponses)
      let scores = calculateCategoryScores(deduped)

      expect(getCategoryScore(scores, 'FINANCIAL')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBeCloseTo(0.8)
      expect(getCategoryScore(scores, 'MARKET')).toBeCloseTo(0.6)
      expect(getCategoryScore(scores, 'LEGAL_TAX')).toBeCloseTo(0.9)
      expect(getCategoryScore(scores, 'PERSONAL')).toBeCloseTo(0.4)

      // Round 2: re-assess FINANCIAL to 0.3
      allResponses = simulateReassessment(allResponses, 0.3, new Date('2025-03-01'))
      deduped = deduplicateResponses(allResponses)
      scores = calculateCategoryScores(deduped)

      expect(getCategoryScore(scores, 'FINANCIAL')).toBeCloseTo(0.3)
      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBeCloseTo(0.8)
      expect(getCategoryScore(scores, 'MARKET')).toBeCloseTo(0.6)
      expect(getCategoryScore(scores, 'LEGAL_TAX')).toBeCloseTo(0.9)
      expect(getCategoryScore(scores, 'PERSONAL')).toBeCloseTo(0.4)

      // Round 3: re-assess FINANCIAL to 1.0
      allResponses = simulateReassessment(allResponses, 1.0, new Date('2025-04-01'))
      deduped = deduplicateResponses(allResponses)
      scores = calculateCategoryScores(deduped)

      expect(getCategoryScore(scores, 'FINANCIAL')).toBeCloseTo(1.0)
      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBeCloseTo(0.8)
      expect(getCategoryScore(scores, 'MARKET')).toBeCloseTo(0.6)
      expect(getCategoryScore(scores, 'LEGAL_TAX')).toBeCloseTo(0.9)
      expect(getCategoryScore(scores, 'PERSONAL')).toBeCloseTo(0.4)
    })

    it('BRI weighted score stays consistent across re-assessments', () => {
      const initialScores = {
        FINANCIAL: 0.8,
        TRANSFERABILITY: 0.6,
        OPERATIONAL: 0.7,
        MARKET: 0.5,
        LEGAL_TAX: 0.9,
        PERSONAL: 0.4,
      }

      // Calculate expected BRI for initial state
      const initialResponses = makeFullAssessmentResponses(initialScores, new Date('2025-01-01'))
      let deduped = deduplicateResponses(initialResponses)
      let scores = calculateCategoryScores(deduped)
      const initialBri = calculateWeightedBriScore(scores)
      // 0.8*0.25 + 0.6*0.20 + 0.7*0.20 + 0.5*0.15 + 0.9*0.10 + 0.4*0.10 = 0.665
      expect(initialBri).toBeCloseTo(0.665)

      // Re-assess ONLY FINANCIAL to 0.9
      const reassessed = [
        makeResponse('q1', 'FINANCIAL', 0.9, 10, new Date('2025-02-01')),
        makeResponse('q2', 'FINANCIAL', 0.9, 10, new Date('2025-02-01')),
        ...initialResponses,
      ]
      deduped = deduplicateResponses(reassessed)
      scores = calculateCategoryScores(deduped)
      const newBri = calculateWeightedBriScore(scores)

      // Only FINANCIAL changed: new = 0.9*0.25 + rest = 0.225 + 0.120 + 0.140 + 0.075 + 0.090 + 0.040 = 0.690
      expect(newBri).toBeCloseTo(0.690)

      // Verify: the difference should only reflect the FINANCIAL change
      const briDelta = newBri - initialBri
      const expectedDelta = (0.9 - 0.8) * DEFAULT_CATEGORY_WEIGHTS.FINANCIAL
      expect(briDelta).toBeCloseTo(expectedDelta)
    })
  })

  describe('Regression: confidence level persistence', () => {
    it('confidence count reflects all questions across assessments', () => {
      // Simulate responses from two different assessments
      // Assessment A: FINANCIAL (2 questions answered)
      // Assessment B: OPERATIONAL (2 questions answered)
      const allResponses = [
        makeResponse('q1', 'FINANCIAL', 0.8, 10, new Date('2025-01-01')),
        makeResponse('q2', 'FINANCIAL', 0.6, 10, new Date('2025-01-01')),
        makeResponse('q3', 'OPERATIONAL', 0.9, 10, new Date('2025-02-01')),
        makeResponse('q4', 'OPERATIONAL', 0.7, 10, new Date('2025-02-01')),
      ]

      const deduped = deduplicateResponses(allResponses)

      // Simulate confidence calculation: count answered questions per category
      const answeredByCategory: Record<string, number> = {}
      for (const r of deduped.values()) {
        if (r.hasOption && r.scoreValue !== null) {
          answeredByCategory[r.briCategory] = (answeredByCategory[r.briCategory] || 0) + 1
        }
      }

      // Both categories should show their correct answered counts
      expect(answeredByCategory['FINANCIAL']).toBe(2)
      expect(answeredByCategory['OPERATIONAL']).toBe(2)
    })

    it('re-assessing FINANCIAL does not change OPERATIONAL confidence', () => {
      // Full initial responses
      const allResponses = [
        makeResponse('q1', 'FINANCIAL', 0.8, 10, new Date('2025-01-01')),
        makeResponse('q2', 'FINANCIAL', 0.6, 10, new Date('2025-01-01')),
        makeResponse('q3', 'OPERATIONAL', 0.9, 10, new Date('2025-01-01')),
        makeResponse('q4', 'OPERATIONAL', 0.7, 10, new Date('2025-01-01')),
      ]

      // Count OPERATIONAL before
      const dedupedBefore = deduplicateResponses(allResponses)
      const opAnsweredBefore = [...dedupedBefore.values()].filter(
        r => r.briCategory === 'OPERATIONAL' && r.hasOption,
      ).length

      // Now re-assess FINANCIAL (newer responses)
      const withReassessment = [
        makeResponse('q1', 'FINANCIAL', 0.9, 10, new Date('2025-02-01')),
        makeResponse('q2', 'FINANCIAL', 0.85, 10, new Date('2025-02-01')),
        ...allResponses,
      ]

      // Count OPERATIONAL after
      const dedupedAfter = deduplicateResponses(withReassessment)
      const opAnsweredAfter = [...dedupedAfter.values()].filter(
        r => r.briCategory === 'OPERATIONAL' && r.hasOption,
      ).length

      expect(opAnsweredAfter).toBe(opAnsweredBefore)
    })
  })

  describe('Financial Health structural bias investigation', () => {
    it('FINANCIAL has the highest weight (0.25)', () => {
      expect(DEFAULT_CATEGORY_WEIGHTS.FINANCIAL).toBe(0.25)
      // Verify it is the highest
      for (const [key, weight] of Object.entries(DEFAULT_CATEGORY_WEIGHTS)) {
        if (key !== 'FINANCIAL') {
          expect(weight).toBeLessThanOrEqual(DEFAULT_CATEGORY_WEIGHTS.FINANCIAL)
        }
      }
    })

    it('all categories default to 0 score when not assessed (no structural bias)', () => {
      // When no responses exist for a category, getCategoryScore returns 0
      const emptyScores: Array<{ category: string; totalPoints: number; earnedPoints: number; score: number }> = []

      for (const cat of BRI_CATEGORIES) {
        expect(getCategoryScore(emptyScores, cat)).toBe(0)
      }
    })

    it('a perfect FINANCIAL score contributes 25% to BRI vs 10% for PERSONAL', () => {
      // Document: a perfect FINANCIAL score (1.0) adds 0.25 to BRI
      // while a perfect PERSONAL score (1.0) adds only 0.10
      // This is by design (buyer readiness weighting) but means
      // FINANCIAL category has 2.5x the impact on the final BRI number
      const financialOnly = [
        { category: 'FINANCIAL', totalPoints: 10, earnedPoints: 10, score: 1.0 },
      ]
      const personalOnly = [
        { category: 'PERSONAL', totalPoints: 10, earnedPoints: 10, score: 1.0 },
      ]

      expect(calculateWeightedBriScore(financialOnly)).toBeCloseTo(0.25)
      expect(calculateWeightedBriScore(personalOnly)).toBeCloseTo(0.10)
    })

    it('FINANCIAL does not default to a different starting score than other categories', () => {
      // When calculated from responses, the starting point for all categories is 0
      // (no structural bias in the scoring function itself)
      const scores = calculateCategoryScores(new Map())
      expect(scores).toHaveLength(0)

      // And getCategoryScore returns 0 for all categories uniformly
      for (const cat of BRI_CATEGORIES) {
        expect(getCategoryScore(scores, cat)).toBe(0)
      }
    })
  })

  describe('Edge cases', () => {
    it('handles duplicate responses from same assessment (same questionId)', () => {
      // If somehow the same question appears twice (shouldn't happen, but defensive)
      const allResponses = [
        makeResponse('q1', 'FINANCIAL', 0.9, 10, new Date('2025-02-01')),
        makeResponse('q1', 'FINANCIAL', 0.5, 10, new Date('2025-01-01')),
      ]

      const deduped = deduplicateResponses(allResponses)
      expect(deduped.size).toBe(1)
      // Should use the first one (newer by sort order)
      expect(deduped.get('q1')?.scoreValue).toBe(0.9)
    })

    it('handles responses with zero maxImpactPoints', () => {
      const responses = new Map<string, ScoringResponse>()
      responses.set('q1', makeResponse('q1', 'FINANCIAL', 0.8, 0))

      const scores = calculateCategoryScores(responses)
      // 0 total points -> score is 0
      expect(scores[0].score).toBe(0)
    })

    it('handles all categories at perfect 1.0 score', () => {
      const perfectScores: Record<string, number> = {}
      for (const cat of BRI_CATEGORIES) {
        perfectScores[cat] = 1.0
      }
      const responses = makeFullAssessmentResponses(perfectScores)
      const deduped = deduplicateResponses(responses)
      const scores = calculateCategoryScores(deduped)
      const bri = calculateWeightedBriScore(scores)

      // Perfect score across all categories = 1.0
      expect(bri).toBeCloseTo(1.0)
    })

    it('handles all categories at zero score', () => {
      const zeroScores: Record<string, number> = {}
      for (const cat of BRI_CATEGORIES) {
        zeroScores[cat] = 0
      }
      const responses = makeFullAssessmentResponses(zeroScores)
      const deduped = deduplicateResponses(responses)
      const scores = calculateCategoryScores(deduped)
      const bri = calculateWeightedBriScore(scores)

      expect(bri).toBeCloseTo(0)
    })
  })

  // ======================================================================
  // CROSS-ASSESSMENT AGGREGATION TESTS
  // Simulates the actual database pattern: responses spread across
  // multiple Assessment records (assessmentId varies)
  // ======================================================================

  describe('Cross-assessment aggregation', () => {
    it('responses from two separate assessments merge correctly', () => {
      // Assessment 1: FINANCIAL + TRANSFERABILITY (January)
      const assessment1Responses = [
        makeResponse('q1', 'FINANCIAL', 0.8, 10, new Date('2025-01-15')),
        makeResponse('q2', 'FINANCIAL', 0.6, 10, new Date('2025-01-15')),
        makeResponse('q3', 'TRANSFERABILITY', 0.7, 10, new Date('2025-01-15')),
        makeResponse('q4', 'TRANSFERABILITY', 0.9, 10, new Date('2025-01-15')),
      ]

      // Assessment 2: OPERATIONAL + MARKET (February)
      const assessment2Responses = [
        makeResponse('q5', 'OPERATIONAL', 0.5, 10, new Date('2025-02-10')),
        makeResponse('q6', 'OPERATIONAL', 0.7, 10, new Date('2025-02-10')),
        makeResponse('q7', 'MARKET', 0.4, 10, new Date('2025-02-10')),
        makeResponse('q8', 'MARKET', 0.6, 10, new Date('2025-02-10')),
      ]

      // Combined (newer first, as DB query would return with updatedAt desc)
      const allResponses = [...assessment2Responses, ...assessment1Responses]
      const deduped = deduplicateResponses(allResponses)
      const scores = calculateCategoryScores(deduped)

      // All 4 categories should be present with correct scores
      expect(getCategoryScore(scores, 'FINANCIAL')).toBeCloseTo(0.7) // (0.8+0.6)/2
      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBeCloseTo(0.8) // (0.7+0.9)/2
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBeCloseTo(0.6) // (0.5+0.7)/2
      expect(getCategoryScore(scores, 'MARKET')).toBeCloseTo(0.5) // (0.4+0.6)/2
    })

    it('newer assessment response overrides older for same questionId', () => {
      // Assessment 1: answers q1 with score 0.3
      const olderResponse = makeResponse('q1', 'FINANCIAL', 0.3, 10, new Date('2025-01-01'))
      // Assessment 2: re-answers q1 with score 0.9
      const newerResponse = makeResponse('q1', 'FINANCIAL', 0.9, 10, new Date('2025-03-01'))

      // Combined (newer first)
      const allResponses = [newerResponse, olderResponse]
      const deduped = deduplicateResponses(allResponses)

      expect(deduped.size).toBe(1)
      expect(deduped.get('q1')?.scoreValue).toBe(0.9)
    })

    it('responses across 3 assessments all contribute to final scores', () => {
      // Assessment 1: FINANCIAL (January)
      const a1 = [
        makeResponse('q1', 'FINANCIAL', 0.8, 10, new Date('2025-01-01')),
        makeResponse('q2', 'FINANCIAL', 0.6, 10, new Date('2025-01-01')),
      ]
      // Assessment 2: OPERATIONAL (February)
      const a2 = [
        makeResponse('q3', 'OPERATIONAL', 0.9, 10, new Date('2025-02-01')),
        makeResponse('q4', 'OPERATIONAL', 0.7, 10, new Date('2025-02-01')),
      ]
      // Assessment 3: PERSONAL (March)
      const a3 = [
        makeResponse('q5', 'PERSONAL', 0.5, 10, new Date('2025-03-01')),
        makeResponse('q6', 'PERSONAL', 0.3, 10, new Date('2025-03-01')),
      ]

      const allResponses = [...a3, ...a2, ...a1]
      const deduped = deduplicateResponses(allResponses)
      const scores = calculateCategoryScores(deduped)

      expect(getCategoryScore(scores, 'FINANCIAL')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBeCloseTo(0.8)
      expect(getCategoryScore(scores, 'PERSONAL')).toBeCloseTo(0.4)

      // Categories without responses still return 0
      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBe(0)
      expect(getCategoryScore(scores, 'MARKET')).toBe(0)
      expect(getCategoryScore(scores, 'LEGAL_TAX')).toBe(0)
    })
  })

  // ======================================================================
  // PARTIAL ASSESSMENT TESTS
  // Verifies correct behavior when not all 6 categories are assessed
  // ======================================================================

  describe('Partial assessment (only some categories assessed)', () => {
    it('3 of 6 categories assessed: scored categories are correct, unassessed are 0', () => {
      const responses = [
        makeResponse('q1', 'FINANCIAL', 0.8, 10),
        makeResponse('q2', 'FINANCIAL', 0.6, 10),
        makeResponse('q3', 'OPERATIONAL', 0.9, 10),
        makeResponse('q4', 'OPERATIONAL', 0.7, 10),
        makeResponse('q5', 'MARKET', 0.5, 10),
        makeResponse('q6', 'MARKET', 0.3, 10),
      ]

      const deduped = deduplicateResponses(responses)
      const scores = calculateCategoryScores(deduped)
      const bri = calculateWeightedBriScore(scores)

      // Only 3 categories contribute to BRI
      expect(getCategoryScore(scores, 'FINANCIAL')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBeCloseTo(0.8)
      expect(getCategoryScore(scores, 'MARKET')).toBeCloseTo(0.4)

      // Unassessed categories are 0
      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBe(0)
      expect(getCategoryScore(scores, 'LEGAL_TAX')).toBe(0)
      expect(getCategoryScore(scores, 'PERSONAL')).toBe(0)

      // BRI is sum of only the assessed categories' weighted scores
      const expected = 0.7 * 0.25 + 0.8 * 0.20 + 0.4 * 0.15
      expect(bri).toBeCloseTo(expected)
    })

    it('single category assessed: BRI only includes that category weight', () => {
      const responses = [
        makeResponse('q1', 'TRANSFERABILITY', 0.9, 10),
        makeResponse('q2', 'TRANSFERABILITY', 0.7, 10),
      ]

      const deduped = deduplicateResponses(responses)
      const scores = calculateCategoryScores(deduped)
      const bri = calculateWeightedBriScore(scores)

      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBeCloseTo(0.8)
      // BRI = 0.8 * 0.20 = 0.16
      expect(bri).toBeCloseTo(0.16)
    })

    it('adding a new category to partial assessment increases BRI correctly', () => {
      // Start with FINANCIAL only
      const financialOnly = [
        makeResponse('q1', 'FINANCIAL', 0.8, 10, new Date('2025-01-01')),
        makeResponse('q2', 'FINANCIAL', 0.6, 10, new Date('2025-01-01')),
      ]

      const deduped1 = deduplicateResponses(financialOnly)
      const scores1 = calculateCategoryScores(deduped1)
      const bri1 = calculateWeightedBriScore(scores1)
      expect(bri1).toBeCloseTo(0.7 * 0.25)

      // Now add OPERATIONAL from a second assessment
      const withOperational = [
        makeResponse('q3', 'OPERATIONAL', 1.0, 10, new Date('2025-02-01')),
        makeResponse('q4', 'OPERATIONAL', 0.8, 10, new Date('2025-02-01')),
        ...financialOnly,
      ]

      const deduped2 = deduplicateResponses(withOperational)
      const scores2 = calculateCategoryScores(deduped2)
      const bri2 = calculateWeightedBriScore(scores2)

      // FINANCIAL unchanged
      expect(getCategoryScore(scores2, 'FINANCIAL')).toBeCloseTo(0.7)
      // OPERATIONAL added
      expect(getCategoryScore(scores2, 'OPERATIONAL')).toBeCloseTo(0.9)
      // BRI increased by the new category's contribution
      const expectedBri2 = 0.7 * 0.25 + 0.9 * 0.20
      expect(bri2).toBeCloseTo(expectedBri2)
      expect(bri2).toBeGreaterThan(bri1)
    })
  })

  // ======================================================================
  // ANSWER UPGRADE SYSTEM TESTS
  // Verifies effectiveOption behavior (task-upgraded answers)
  // ======================================================================

  describe('Answer Upgrade System (effectiveOption)', () => {
    it('response with upgraded score uses effective value', () => {
      // Original answer: 0.5, upgraded by task completion to 0.9
      const upgraded: ScoringResponse = {
        questionId: 'q1',
        briCategory: 'FINANCIAL',
        maxImpactPoints: 10,
        scoreValue: 0.9, // This is the effectiveOption scoreValue
        hasOption: true,
        updatedAt: new Date('2025-01-01'),
      }

      const responses = new Map<string, ScoringResponse>()
      responses.set('q1', upgraded)
      const scores = calculateCategoryScores(responses)

      // Score should use the effective (upgraded) value
      expect(scores[0].score).toBe(0.9)
    })

    it('mixing upgraded and non-upgraded responses in same category', () => {
      const responses = new Map<string, ScoringResponse>()
      // Question 1: upgraded from 0.3 to 0.8
      responses.set('q1', makeResponse('q1', 'FINANCIAL', 0.8, 10))
      // Question 2: not upgraded, original 0.6
      responses.set('q2', makeResponse('q2', 'FINANCIAL', 0.6, 10))

      const scores = calculateCategoryScores(responses)
      // (10*0.8 + 10*0.6) / (10+10) = 0.7
      expect(scores[0].score).toBeCloseTo(0.7)
    })
  })

  // ======================================================================
  // COMPREHENSIVE END-TO-END SCENARIO
  // Simulates the full user journey that triggered the original bug
  // ======================================================================

  describe('End-to-end: Full assessment then category re-assessment', () => {
    it('complete initial assessment, then re-assess one category via inline flow', () => {
      // Step 1: User completes initial full assessment (all 6 categories)
      const initialScores = {
        FINANCIAL: 0.6,
        TRANSFERABILITY: 0.7,
        OPERATIONAL: 0.5,
        MARKET: 0.8,
        LEGAL_TAX: 0.4,
        PERSONAL: 0.3,
      }
      const initialResponses = makeFullAssessmentResponses(initialScores, new Date('2025-01-01'))

      // Verify initial BRI
      const deduped1 = deduplicateResponses(initialResponses)
      const scores1 = calculateCategoryScores(deduped1)
      const bri1 = calculateWeightedBriScore(scores1)

      const expectedBri1 =
        0.6 * 0.25 + 0.7 * 0.20 + 0.5 * 0.20 + 0.8 * 0.15 + 0.4 * 0.10 + 0.3 * 0.10
      expect(bri1).toBeCloseTo(expectedBri1)

      // Step 2: User re-assesses ONLY FINANCIAL via inline CategoryAssessmentFlow
      // This creates NEW responses for q1, q2 (FINANCIAL questions) with newer timestamps
      // The recalculate-bri endpoint gathers ALL responses across all assessments
      const reassessedFinancial = [
        makeResponse('q1', 'FINANCIAL', 0.9, 10, new Date('2025-03-01')),
        makeResponse('q2', 'FINANCIAL', 0.85, 10, new Date('2025-03-01')),
      ]

      // The recalculate-bri endpoint would combine all responses:
      const allResponses = [...reassessedFinancial, ...initialResponses]

      const deduped2 = deduplicateResponses(allResponses)
      const scores2 = calculateCategoryScores(deduped2)
      const bri2 = calculateWeightedBriScore(scores2)

      // CRITICAL: FINANCIAL updated, all others UNCHANGED
      expect(getCategoryScore(scores2, 'FINANCIAL')).toBeCloseTo(0.875)
      expect(getCategoryScore(scores2, 'TRANSFERABILITY')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores2, 'OPERATIONAL')).toBeCloseTo(0.5)
      expect(getCategoryScore(scores2, 'MARKET')).toBeCloseTo(0.8)
      expect(getCategoryScore(scores2, 'LEGAL_TAX')).toBeCloseTo(0.4)
      expect(getCategoryScore(scores2, 'PERSONAL')).toBeCloseTo(0.3)

      // BRI should increase only by the FINANCIAL delta
      const expectedBri2 =
        0.875 * 0.25 + 0.7 * 0.20 + 0.5 * 0.20 + 0.8 * 0.15 + 0.4 * 0.10 + 0.3 * 0.10
      expect(bri2).toBeCloseTo(expectedBri2)
      expect(bri2).toBeGreaterThan(bri1)

      // Step 3: User re-assesses OPERATIONAL (third assessment, two categories changed)
      const reassessedOperational = [
        makeResponse('q5', 'OPERATIONAL', 0.95, 10, new Date('2025-04-01')),
        makeResponse('q6', 'OPERATIONAL', 0.85, 10, new Date('2025-04-01')),
      ]

      const allResponses3 = [...reassessedOperational, ...allResponses]
      const deduped3 = deduplicateResponses(allResponses3)
      const scores3 = calculateCategoryScores(deduped3)
      const bri3 = calculateWeightedBriScore(scores3)

      // FINANCIAL still at the re-assessed value
      expect(getCategoryScore(scores3, 'FINANCIAL')).toBeCloseTo(0.875)
      // OPERATIONAL updated
      expect(getCategoryScore(scores3, 'OPERATIONAL')).toBeCloseTo(0.9)
      // All others still original
      expect(getCategoryScore(scores3, 'TRANSFERABILITY')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores3, 'MARKET')).toBeCloseTo(0.8)
      expect(getCategoryScore(scores3, 'LEGAL_TAX')).toBeCloseTo(0.4)
      expect(getCategoryScore(scores3, 'PERSONAL')).toBeCloseTo(0.3)

      // BRI increased again
      expect(bri3).toBeGreaterThan(bri2)
    })

    it('re-assess same category with WORSE score: other categories unaffected', () => {
      const initialScores = {
        FINANCIAL: 0.8,
        TRANSFERABILITY: 0.7,
        OPERATIONAL: 0.6,
        MARKET: 0.5,
        LEGAL_TAX: 0.9,
        PERSONAL: 0.4,
      }
      const initialResponses = makeFullAssessmentResponses(initialScores, new Date('2025-01-01'))

      // Re-assess FINANCIAL with a WORSE score
      const worseFinancial = [
        makeResponse('q1', 'FINANCIAL', 0.2, 10, new Date('2025-02-01')),
        makeResponse('q2', 'FINANCIAL', 0.3, 10, new Date('2025-02-01')),
      ]

      const allResponses = [...worseFinancial, ...initialResponses]
      const deduped = deduplicateResponses(allResponses)
      const scores = calculateCategoryScores(deduped)

      // FINANCIAL dropped
      expect(getCategoryScore(scores, 'FINANCIAL')).toBeCloseTo(0.25) // (0.2+0.3)/2
      // All others unchanged
      expect(getCategoryScore(scores, 'TRANSFERABILITY')).toBeCloseTo(0.7)
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBeCloseTo(0.6)
      expect(getCategoryScore(scores, 'MARKET')).toBeCloseTo(0.5)
      expect(getCategoryScore(scores, 'LEGAL_TAX')).toBeCloseTo(0.9)
      expect(getCategoryScore(scores, 'PERSONAL')).toBeCloseTo(0.4)
    })

    it('mixed NOT_APPLICABLE and scored responses across assessments', () => {
      // Assessment 1: FINANCIAL answered, OPERATIONAL marked N/A
      const a1 = [
        makeResponse('q1', 'FINANCIAL', 0.8, 10, new Date('2025-01-01')),
        makeNotApplicable('q3', 'OPERATIONAL', new Date('2025-01-01')),
      ]

      // Assessment 2: Add MARKET answers
      const a2 = [
        makeResponse('q5', 'MARKET', 0.6, 10, new Date('2025-02-01')),
      ]

      const allResponses = [...a2, ...a1]
      const deduped = deduplicateResponses(allResponses)
      const scores = calculateCategoryScores(deduped)

      // FINANCIAL scored normally
      expect(getCategoryScore(scores, 'FINANCIAL')).toBe(0.8)
      // MARKET scored normally
      expect(getCategoryScore(scores, 'MARKET')).toBe(0.6)
      // OPERATIONAL was N/A, so not in scores
      expect(getCategoryScore(scores, 'OPERATIONAL')).toBe(0)
      // Deduped map still has the N/A entry, but calculateCategoryScores skips it
      expect(deduped.has('q3')).toBe(true)
      expect(deduped.get('q3')?.hasOption).toBe(false)
    })
  })
})
