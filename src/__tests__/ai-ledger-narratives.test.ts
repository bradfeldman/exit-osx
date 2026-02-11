import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock Dependencies ──────────────────────────────────────────────────

vi.mock('@/lib/ai/anthropic', () => ({
  generateText: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    companyDossier: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    company: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    valuationSnapshot: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    aIGenerationLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

// ─── Import after mocks ────────────────────────────────────────────────

import { generateAINarrative, type AILedgerNarrativeInput } from '@/lib/value-ledger/ai-narratives'
import { generateText } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'

const mockGenerateText = vi.mocked(generateText)
const mockPrisma = vi.mocked(prisma, true)

// ─── Test Data ──────────────────────────────────────────────────────────

const MOCK_DOSSIER_CONTENT = {
  identity: {
    name: 'Acme Corp',
    industry: 'Technology',
    subSector: 'Enterprise Software',
    businessDescription: 'Cloud-based CRM platform',
  },
  valuation: {
    briScore: 0.65,
    valueGap: 500_000,
    currentValue: 2_500_000,
  },
}

function makeInput(overrides: Partial<AILedgerNarrativeInput> = {}): AILedgerNarrativeInput {
  return {
    companyId: 'company-1',
    eventType: 'TASK_COMPLETED',
    category: 'FINANCIAL',
    title: 'Implement revenue forecasting system',
    deltaValueRecovered: 45_000,
    briScoreBefore: 0.60,
    briScoreAfter: 0.65,
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('generateAINarrative', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── AI-Eligible Events ──────────────────────────────────────────────

  describe('AI-eligible events (TASK_COMPLETED, ASSESSMENT_COMPLETED)', () => {
    it('generates AI narrative for TASK_COMPLETED when context is available', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: 'Revenue forecasting task recovered ~$45K in buyer-perceived value for Acme Corp.',
        usage: { inputTokens: 150, outputTokens: 30 },
      })

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('ai')
      expect(result.narrative).toContain('Revenue forecasting')
      expect(mockGenerateText).toHaveBeenCalledOnce()
    })

    it('generates AI narrative for ASSESSMENT_COMPLETED', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: 'BRI improved from 62.3 to 67.8 — operational gaps that buyers flag in diligence are closing.',
        usage: { inputTokens: 120, outputTokens: 25 },
      })

      const result = await generateAINarrative(makeInput({
        eventType: 'ASSESSMENT_COMPLETED',
        title: undefined,
        deltaValueRecovered: undefined,
      }))

      expect(result.source).toBe('ai')
      expect(result.narrative).toContain('BRI improved')
    })

    it('uses haiku model with correct parameters', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: 'Test narrative',
        usage: { inputTokens: 100, outputTokens: 20 },
      })

      await generateAINarrative(makeInput())

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { model: 'claude-haiku', maxTokens: 256, temperature: 0.7 }
      )
    })

    it('logs AI generation to AIGenerationLog', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: 'Test narrative for logging',
        usage: { inputTokens: 100, outputTokens: 20 },
      })

      await generateAINarrative(makeInput())

      // Log is fire-and-forget, so verify it was called
      expect(mockPrisma.aIGenerationLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          generationType: 'ledger_narrative',
          modelUsed: 'claude-haiku',
          inputTokens: 100,
          outputTokens: 20,
        }),
      })
    })
  })

  // ── Template Fallback ───────────────────────────────────────────────

  describe('template fallback events', () => {
    it('uses template for DRIFT_DETECTED (not AI-eligible)', async () => {
      const result = await generateAINarrative(makeInput({
        eventType: 'DRIFT_DETECTED',
        deltaValueAtRisk: 30_000,
        daysSinceUpdate: 45,
      }))

      expect(result.source).toBe('template')
      expect(result.narrative).toContain('days stale')
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('uses template for SIGNAL_CONFIRMED', async () => {
      const result = await generateAINarrative(makeInput({
        eventType: 'SIGNAL_CONFIRMED',
        description: 'Revenue decline detected',
        deltaValueAtRisk: 50_000,
      }))

      expect(result.source).toBe('template')
      expect(result.narrative).toContain('Confirmed')
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('uses template for REGRESSION_DETECTED', async () => {
      const result = await generateAINarrative(makeInput({
        eventType: 'REGRESSION_DETECTED',
        deltaValueAtRisk: 20_000,
      }))

      expect(result.source).toBe('template')
      expect(result.narrative).toContain('Regression')
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('uses template for BENCHMARK_SHIFT', async () => {
      const result = await generateAINarrative(makeInput({
        eventType: 'BENCHMARK_SHIFT',
        description: 'Market multiple adjustment',
      }))

      expect(result.source).toBe('template')
      expect(result.narrative).toContain('benchmark')
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('uses template for NEW_DATA_CONNECTED', async () => {
      const result = await generateAINarrative(makeInput({
        eventType: 'NEW_DATA_CONNECTED',
        description: 'QuickBooks sync',
      }))

      expect(result.source).toBe('template')
      expect(result.narrative).toContain('data connected')
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('uses template for SNAPSHOT_CREATED', async () => {
      const result = await generateAINarrative(makeInput({
        eventType: 'SNAPSHOT_CREATED',
        description: 'Quarterly progress',
      }))

      expect(result.source).toBe('template')
      expect(result.narrative).toContain('snapshot')
      expect(mockGenerateText).not.toHaveBeenCalled()
    })
  })

  // ── Graceful Degradation ────────────────────────────────────────────

  describe('graceful degradation', () => {
    it('falls back to template when AI fails', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockRejectedValue(new Error('API timeout'))

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('template')
      expect(result.narrative).toContain("'Implement revenue forecasting system'")
      expect(result.narrative).toContain('$45K')
    })

    it('falls back to template when no company context is available', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue(null)
      mockPrisma.company.findUnique.mockResolvedValue(null)

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('template')
      expect(mockGenerateText).not.toHaveBeenCalled()
    })

    it('falls back to template when AI returns empty text', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: '',
        usage: { inputTokens: 100, outputTokens: 0 },
      })

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('template')
    })

    it('falls back to template when AI returns very short text', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: 'OK',
        usage: { inputTokens: 100, outputTokens: 5 },
      })

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('template')
    })

    it('never throws — always returns a narrative', async () => {
      mockPrisma.companyDossier.findFirst.mockRejectedValue(new Error('DB down'))

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('template')
      expect(result.narrative).toBeTruthy()
    })
  })

  // ── Narrative Cleaning ──────────────────────────────────────────────

  describe('narrative cleaning', () => {
    it('strips surrounding quotes from AI response', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: '"Revenue task improved buyer confidence by demonstrating financial discipline."',
        usage: { inputTokens: 100, outputTokens: 20 },
      })

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('ai')
      expect(result.narrative).not.toMatch(/^["']/)
      expect(result.narrative).not.toMatch(/["']$/)
    })

    it('truncates AI narrative to 300 characters', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      const longText = 'A'.repeat(400)
      mockGenerateText.mockResolvedValue({
        text: longText,
        usage: { inputTokens: 100, outputTokens: 200 },
      })

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('ai')
      expect(result.narrative.length).toBeLessThanOrEqual(300)
    })
  })

  // ── Context Building ────────────────────────────────────────────────

  describe('context resolution', () => {
    it('prefers dossier context over direct DB queries', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue({
        id: 'dossier-1',
        content: MOCK_DOSSIER_CONTENT,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: 'Test narrative with dossier context',
        usage: { inputTokens: 100, outputTokens: 20 },
      })

      await generateAINarrative(makeInput())

      // Should use dossier, not query company directly
      expect(mockPrisma.companyDossier.findFirst).toHaveBeenCalled()
      expect(mockPrisma.company.findUnique).not.toHaveBeenCalled()

      // Verify prompt contains dossier data
      const [prompt] = mockGenerateText.mock.calls[0]
      expect(prompt).toContain('Acme Corp')
      expect(prompt).toContain('Technology')
    })

    it('falls back to DB queries when dossier has no content', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue(null)
      mockPrisma.company.findUnique.mockResolvedValue({
        name: 'Fallback Corp',
        icbIndustry: 'Healthcare',
        icbSubSector: 'Biotech',
      } as never)
      mockPrisma.valuationSnapshot.findFirst.mockResolvedValue({
        briScore: 0.72,
        valueGap: 300_000,
        currentValue: 1_800_000,
      } as never)

      mockGenerateText.mockResolvedValue({
        text: 'Task completion improved Healthcare readiness.',
        usage: { inputTokens: 80, outputTokens: 15 },
      })

      const result = await generateAINarrative(makeInput())

      expect(result.source).toBe('ai')
      expect(mockPrisma.company.findUnique).toHaveBeenCalled()
      expect(mockPrisma.valuationSnapshot.findFirst).toHaveBeenCalled()
    })
  })

  // ── Template Integrity ──────────────────────────────────────────────

  describe('template narrative correctness', () => {
    it('TASK_COMPLETED with value shows dollar amount', async () => {
      const result = await generateAINarrative(makeInput({
        eventType: 'DRIFT_DETECTED', // Force template path
        deltaValueAtRisk: 75_000,
        daysSinceUpdate: 30,
      }))

      expect(result.source).toBe('template')
      expect(result.narrative).toContain('$75K')
    })

    it('TASK_COMPLETED without value shows category', async () => {
      mockPrisma.companyDossier.findFirst.mockResolvedValue(null)
      mockPrisma.company.findUnique.mockResolvedValue(null)

      const result = await generateAINarrative(makeInput({
        deltaValueRecovered: 0,
      }))

      // Falls back to template since no context
      expect(result.source).toBe('template')
      expect(result.narrative).toContain('Financial')
    })
  })
})
