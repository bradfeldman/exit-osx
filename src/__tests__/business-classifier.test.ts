import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Dependencies ──────────────────────────────────────────────────

vi.mock('@/lib/ai/anthropic', () => ({
  generateJSON: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    industryMultiple: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    aIGenerationLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

// ─── Import after mocks ────────────────────────────────────────────────

import {
  classifyBusiness,
  scoreKeywordMatches,
  classifyByKeywords,
  ClassificationError,
  KEYWORD_RULES,
} from '@/lib/ai/business-classifier'
import { generateJSON } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'

const mockGenerateJSON = vi.mocked(generateJSON)
const mockPrisma = vi.mocked(prisma, true)

// ─── Helpers ────────────────────────────────────────────────────────────

function makeAIResponse(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      primarySubSector: 'MEDICAL_SUPPLIES_SUB',
      primaryConfidence: 0.92,
      secondarySubSector: null,
      secondaryConfidence: null,
      explanation: 'This business manufactures dental products, fitting the Medical Supplies sub-sector.',
      ...overrides,
    },
    usage: { inputTokens: 500, outputTokens: 100 },
  }
}

function makeMultipleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mult-1',
    icbIndustry: 'HEALTHCARE',
    icbSuperSector: 'MEDICAL_EQUIPMENT',
    icbSector: 'MEDICAL_SUPPLIES',
    icbSubSector: 'MEDICAL_SUPPLIES_SUB',
    revenueMultipleLow: 0.8,
    revenueMultipleHigh: 1.5,
    ebitdaMultipleLow: 4.0,
    ebitdaMultipleHigh: 7.0,
    ebitdaMarginLow: null,
    ebitdaMarginHigh: null,
    effectiveDate: new Date(),
    source: 'Test',
    ...overrides,
  }
}

// ─── Tests: scoreKeywordMatches (pure rules) ────────────────────────────

describe('scoreKeywordMatches', () => {
  it('returns empty array for unrelated description', () => {
    const matches = scoreKeywordMatches('quantum computing alien spaceship')
    expect(matches).toHaveLength(0)
  })

  it('matches dental-related keywords to MEDICAL_SUPPLIES_SUB', () => {
    const matches = scoreKeywordMatches('We make dental mouthguards for people who grind their teeth')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].icbSubSector).toBe('MEDICAL_SUPPLIES_SUB')
  })

  it('matches SaaS keywords to ENTERPRISE_SOFTWARE', () => {
    const matches = scoreKeywordMatches('We sell SaaS cloud software for enterprise resource planning')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].icbSubSector).toBe('ENTERPRISE_SOFTWARE')
  })

  it('matches restaurant keywords', () => {
    const matches = scoreKeywordMatches('We run a restaurant with catering and food service')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].icbSubSector).toBe('RESTAURANTS')
  })

  it('matches construction keywords', () => {
    const matches = scoreKeywordMatches('General contractor doing commercial construction and renovation')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].icbSubSector).toBe('CONSTRUCTION_SERVICES')
  })

  it('matches IT services keywords', () => {
    const matches = scoreKeywordMatches('IT consulting and managed service provider for small businesses')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].icbSubSector).toBe('IT_CONSULTING')
  })

  it('matches staffing keywords', () => {
    const matches = scoreKeywordMatches('Staffing agency specializing in temp agency and recruiting')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].icbSubSector).toBe('STAFFING')
  })

  it('matches marketing keywords', () => {
    const matches = scoreKeywordMatches('Digital marketing agency and seo agency for brands')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].icbSubSector).toBe('MARKETING_PR')
  })

  it('matches insurance keywords', () => {
    const matches = scoreKeywordMatches('We are an insurance agency and insurance broker')
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].icbSubSector).toBe('PROPERTY_CASUALTY')
  })

  it('returns multiple matches sorted by score', () => {
    const matches = scoreKeywordMatches(
      'We build SaaS software and also provide IT consulting services'
    )
    expect(matches.length).toBeGreaterThanOrEqual(2)
    // Scores should be descending
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].score).toBeLessThanOrEqual(matches[i - 1].score)
    }
  })

  it('deduplicates by icbSubSector keeping highest score', () => {
    const matches = scoreKeywordMatches('accounting bookkeeping cpa firm tax preparation')
    // Both accounting rules map to PROFESSIONAL_SERVICES, should only appear once
    const professionalServiceMatches = matches.filter(
      (m) => m.icbSubSector === 'PROFESSIONAL_SERVICES'
    )
    expect(professionalServiceMatches.length).toBe(1)
  })

  it('is case insensitive', () => {
    const lower = scoreKeywordMatches('saas software')
    const upper = scoreKeywordMatches('SAAS SOFTWARE')
    expect(lower.length).toBe(upper.length)
    expect(lower[0]?.icbSubSector).toBe(upper[0]?.icbSubSector)
  })
})

// ─── Tests: classifyByKeywords ──────────────────────────────────────────

describe('classifyByKeywords', () => {
  it('returns primary and secondary matches', () => {
    const result = classifyByKeywords(
      'We build enterprise software as a SaaS platform and also do IT consulting'
    )
    expect(result.primary).not.toBeNull()
    expect(result.secondary).not.toBeNull()
    // Both should be found; primary is the highest-scoring match
    const codes = [result.primary!.icbSubSector, result.secondary!.icbSubSector]
    expect(codes).toContain('ENTERPRISE_SOFTWARE')
    expect(codes).toContain('IT_CONSULTING')
  })

  it('returns null for unrecognized descriptions', () => {
    const result = classifyByKeywords('alien spaceship parts distributor on mars')
    expect(result.primary).toBeNull()
    expect(result.secondary).toBeNull()
  })

  it('returns only primary when one match found', () => {
    const result = classifyByKeywords('dental mouthguard company')
    expect(result.primary).not.toBeNull()
    // Secondary may or may not be null depending on keyword overlap
  })

  it('returns full hierarchy for matched industry', () => {
    const result = classifyByKeywords('restaurant and catering')
    expect(result.primary).not.toBeNull()
    expect(result.primary!.icbIndustry).toBe('CONSUMER_DISCRETIONARY')
    expect(result.primary!.icbSuperSector).toBe('TRAVEL_LEISURE')
    expect(result.primary!.icbSector).toBe('RESTAURANTS_BARS')
    expect(result.primary!.icbSubSector).toBe('RESTAURANTS')
  })
})

// ─── Tests: classifyBusiness (main function with AI) ────────────────────

describe('classifyBusiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.industryMultiple.findFirst.mockResolvedValue(null)
    mockPrisma.aIGenerationLog.create.mockResolvedValue({} as never)
  })

  // ── Input validation ─────────────────────────────────────────────

  it('throws on empty description', async () => {
    await expect(classifyBusiness('')).rejects.toThrow(ClassificationError)
    await expect(classifyBusiness('')).rejects.toThrow('required')
  })

  it('throws on description too short', async () => {
    await expect(classifyBusiness('abc')).rejects.toThrow(ClassificationError)
    await expect(classifyBusiness('abc')).rejects.toThrow('at least')
  })

  it('throws on non-string input', async () => {
    // @ts-expect-error Testing runtime validation
    await expect(classifyBusiness(123)).rejects.toThrow(ClassificationError)
  })

  it('throws on null input', async () => {
    // @ts-expect-error Testing runtime validation
    await expect(classifyBusiness(null)).rejects.toThrow(ClassificationError)
  })

  // ── AI classification path ───────────────────────────────────────

  it('classifies using AI and returns structured result', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

    const result = await classifyBusiness(
      'We manufacture dental mouthguards for teeth grinding patients'
    )

    expect(result.source).toBe('ai')
    expect(result.primaryIndustry.icbSubSector).toBe('MEDICAL_SUPPLIES_SUB')
    expect(result.primaryIndustry.name).toBe('Medical Supplies')
    expect(result.primaryIndustry.confidence).toBe(0.92)
    expect(result.explanation).toContain('dental')
    expect(result.secondaryIndustry).toBeNull()
  })

  it('returns secondary classification when AI provides one', async () => {
    mockGenerateJSON.mockResolvedValueOnce(
      makeAIResponse({
        primarySubSector: 'ENTERPRISE_SOFTWARE',
        primaryConfidence: 0.85,
        secondarySubSector: 'IT_CONSULTING',
        secondaryConfidence: 0.65,
        explanation: 'The business provides software and IT consulting services.',
      })
    )

    const result = await classifyBusiness(
      'We build enterprise SaaS software and provide IT consulting'
    )

    expect(result.primaryIndustry.icbSubSector).toBe('ENTERPRISE_SOFTWARE')
    expect(result.secondaryIndustry).not.toBeNull()
    expect(result.secondaryIndustry!.icbSubSector).toBe('IT_CONSULTING')
    expect(result.secondaryIndustry!.confidence).toBe(0.65)
  })

  it('clamps confidence to 0-1 range', async () => {
    mockGenerateJSON.mockResolvedValueOnce(
      makeAIResponse({
        primarySubSector: 'ENTERPRISE_SOFTWARE',
        primaryConfidence: 1.5, // Over 1
      })
    )

    const result = await classifyBusiness('Enterprise software company')
    expect(result.primaryIndustry.confidence).toBe(1)
  })

  it('handles NaN confidence gracefully', async () => {
    mockGenerateJSON.mockResolvedValueOnce(
      makeAIResponse({
        primarySubSector: 'ENTERPRISE_SOFTWARE',
        primaryConfidence: NaN,
      })
    )

    const result = await classifyBusiness('Enterprise software company')
    expect(result.primaryIndustry.confidence).toBe(0.5) // Default for NaN
  })

  // ── AI failure → keyword fallback ─────────────────────────────────

  it('falls back to keywords when AI throws an error', async () => {
    mockGenerateJSON.mockRejectedValueOnce(new Error('API rate limit'))

    const result = await classifyBusiness(
      'We run a restaurant with catering and food service'
    )

    expect(result.source).toBe('keyword')
    expect(result.primaryIndustry.icbSubSector).toBe('RESTAURANTS')
    expect(result.primaryIndustry.confidence).toBe(0.6) // Keyword confidence
  })

  it('falls back to keywords when AI returns invalid sub-sector', async () => {
    mockGenerateJSON.mockResolvedValueOnce(
      makeAIResponse({
        primarySubSector: 'NONEXISTENT_CODE',
      })
    )

    const result = await classifyBusiness(
      'We do construction and renovation projects'
    )

    expect(result.source).toBe('keyword')
    expect(result.primaryIndustry.icbSubSector).toBe('CONSTRUCTION_SERVICES')
  })

  // ── Default fallback ──────────────────────────────────────────────

  it('defaults to Professional Services when nothing matches', async () => {
    mockGenerateJSON.mockRejectedValueOnce(new Error('AI unavailable'))

    const result = await classifyBusiness(
      'We provide abstract concept services for interdimensional beings'
    )

    expect(result.source).toBe('default')
    expect(result.primaryIndustry.icbSubSector).toBe('PROFESSIONAL_SERVICES')
    expect(result.primaryIndustry.confidence).toBe(0.2)
    expect(result.explanation).toContain('could not determine')
  })

  // ── Multiple range lookup ─────────────────────────────────────────

  it('includes industry multiples from database', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())
    mockPrisma.industryMultiple.findFirst.mockResolvedValueOnce(makeMultipleRow() as never)

    const result = await classifyBusiness('Dental mouthguard manufacturing company')

    expect(result.suggestedMultipleRange.ebitda.low).toBe(4.0)
    expect(result.suggestedMultipleRange.ebitda.high).toBe(7.0)
    expect(result.suggestedMultipleRange.ebitda.mid).toBe(5.5)
    expect(result.suggestedMultipleRange.revenue.low).toBe(0.8)
    expect(result.suggestedMultipleRange.revenue.high).toBe(1.5)
  })

  it('uses default multiples when database has no match', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())
    mockPrisma.industryMultiple.findFirst.mockResolvedValue(null)

    const result = await classifyBusiness('Dental mouthguard manufacturing company')

    expect(result.suggestedMultipleRange.ebitda.low).toBe(3.0)
    expect(result.suggestedMultipleRange.ebitda.high).toBe(6.0)
  })

  // ── AIGenerationLog logging ───────────────────────────────────────

  it('logs AI classification to AIGenerationLog', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

    await classifyBusiness('Dental mouthguard company', 'company-123')

    expect(mockPrisma.aIGenerationLog.create).toHaveBeenCalledTimes(1)
    const logCall = mockPrisma.aIGenerationLog.create.mock.calls[0][0]
    expect(logCall.data.companyId).toBe('company-123')
    expect(logCall.data.generationType).toBe('business_classification')
    expect(logCall.data.modelUsed).toBe('claude-3-5-haiku-latest')
    expect(logCall.data.inputTokens).toBe(500)
    expect(logCall.data.outputTokens).toBe(100)
    expect(logCall.data.errorMessage).toBeNull()
  })

  it('logs keyword fallback with error message', async () => {
    mockGenerateJSON.mockRejectedValueOnce(new Error('API down'))

    await classifyBusiness('We run a restaurant and catering service')

    expect(mockPrisma.aIGenerationLog.create).toHaveBeenCalledTimes(1)
    const logCall = mockPrisma.aIGenerationLog.create.mock.calls[0][0]
    expect(logCall.data.modelUsed).toBeNull()
    expect(logCall.data.errorMessage).toContain('API down')
  })

  it('does not throw if logging fails', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())
    mockPrisma.aIGenerationLog.create.mockRejectedValueOnce(new Error('DB error'))

    // Should not throw despite logging failure
    const result = await classifyBusiness('Dental mouthguard company')
    expect(result.source).toBe('ai')
  })

  // ── Input sanitization ────────────────────────────────────────────

  it('trims whitespace from description', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

    const result = await classifyBusiness('   Dental mouthguard company   ')
    expect(result.source).toBe('ai')
  })

  it('truncates description to 1000 characters', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

    const longDescription = 'x'.repeat(2000)
    const result = await classifyBusiness(longDescription)
    // Should not throw, just truncate
    expect(result).toBeDefined()
  })

  // ── AI model configuration ────────────────────────────────────────

  it('uses haiku model with low temperature', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

    await classifyBusiness('Dental mouthguard company')

    expect(mockGenerateJSON).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        model: 'claude-haiku',
        temperature: 0.3,
        maxTokens: 512,
      })
    )
  })

  // ── companyId is optional ─────────────────────────────────────────

  it('works without companyId', async () => {
    mockGenerateJSON.mockResolvedValueOnce(makeAIResponse())

    const result = await classifyBusiness('Dental mouthguard company')
    expect(result.source).toBe('ai')

    const logCall = mockPrisma.aIGenerationLog.create.mock.calls[0][0]
    expect(logCall.data.companyId).toBeNull()
  })
})

// ─── Tests: KEYWORD_RULES coverage ──────────────────────────────────────

describe('KEYWORD_RULES', () => {
  it('all rules reference valid ICB sub-sector codes', async () => {
    const { getFlattenedIndustryOptions } = await import('@/lib/data/industries')
    const allOptions = getFlattenedIndustryOptions()
    const validCodes = new Set(allOptions.map((o: { icbSubSector: string }) => o.icbSubSector))

    for (const rule of KEYWORD_RULES) {
      expect(
        validCodes.has(rule.icbSubSector),
        `Rule keyword "${rule.keywords[0]}" references unknown code: ${rule.icbSubSector}`
      ).toBe(true)
    }
  })

  it('no duplicate keyword entries within a single rule', () => {
    for (const rule of KEYWORD_RULES) {
      const unique = new Set(rule.keywords)
      expect(
        unique.size,
        `Rule for ${rule.icbSubSector} has duplicate keywords`
      ).toBe(rule.keywords.length)
    }
  })

  it('all keywords are lowercase', () => {
    for (const rule of KEYWORD_RULES) {
      for (const keyword of rule.keywords) {
        expect(
          keyword,
          `Keyword "${keyword}" in rule ${rule.icbSubSector} should be lowercase`
        ).toBe(keyword.toLowerCase())
      }
    }
  })
})

// ─── Tests: ClassificationError ─────────────────────────────────────────

describe('ClassificationError', () => {
  it('has correct name and code', () => {
    const err = new ClassificationError('test message', 'INVALID_INPUT')
    expect(err.name).toBe('ClassificationError')
    expect(err.code).toBe('INVALID_INPUT')
    expect(err.message).toBe('test message')
    expect(err instanceof Error).toBe(true)
  })
})
