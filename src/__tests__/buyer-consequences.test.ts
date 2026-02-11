import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateFallbackConsequence,
  type TaskForConsequence,
  type CompanyContext,
} from '@/lib/ai/buyer-consequences'

// ─── Mock Dependencies ──────────────────────────────────────────────────

vi.mock('@/lib/ai/anthropic', () => ({
  generateJSON: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    companyDossier: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    company: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    financialPeriod: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    aIGenerationLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

// ─── Import after mocks ────────────────────────────────────────────────

import { generateBuyerConsequences } from '@/lib/ai/buyer-consequences'
import { generateJSON } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'

const mockGenerateJSON = vi.mocked(generateJSON)
const mockPrisma = vi.mocked(prisma, true)

// ─── Test Data ──────────────────────────────────────────────────────────

function makeTask(overrides: Partial<TaskForConsequence> = {}): TaskForConsequence {
  return {
    id: 'task-1',
    title: 'Implement revenue forecasting system',
    description: 'Create a rolling 12-month revenue forecast.',
    briCategory: 'FINANCIAL',
    issueTier: 'CRITICAL',
    buyerConsequence: null,
    ...overrides,
  }
}

const MOCK_DOSSIER_CONTENT = {
  identity: {
    name: 'Acme Corp',
    industry: 'Technology',
    subSector: 'Software Services',
    businessDescription: 'Enterprise SaaS platform',
  },
  financials: {
    annualRevenue: 5_000_000,
    annualEbitda: 1_200_000,
  },
}

// ─── Tests: generateFallbackConsequence ─────────────────────────────────

describe('generateFallbackConsequence', () => {
  it('generates a FINANCIAL category consequence', () => {
    const result = generateFallbackConsequence('FINANCIAL', null)
    expect(result).toContain('buyer')
    expect(result).toContain('valuation')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('generates a TRANSFERABILITY category consequence', () => {
    const result = generateFallbackConsequence('TRANSFERABILITY', null)
    expect(result).toContain('buyer')
    expect(result).toContain('owner')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('generates an OPERATIONAL category consequence', () => {
    const result = generateFallbackConsequence('OPERATIONAL', null)
    expect(result).toContain('buyer')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('generates a MARKET category consequence', () => {
    const result = generateFallbackConsequence('MARKET', null)
    expect(result).toContain('buyer')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('generates a LEGAL_TAX category consequence', () => {
    const result = generateFallbackConsequence('LEGAL_TAX', null)
    expect(result).toContain('buyer')
    expect(result).toContain('legal')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('generates a PERSONAL category consequence', () => {
    const result = generateFallbackConsequence('PERSONAL', null)
    expect(result).toContain('buyer')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('includes tier modifier for CRITICAL issues', () => {
    const result = generateFallbackConsequence('FINANCIAL', 'CRITICAL')
    expect(result).toContain('deal-breaker')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('includes tier modifier for SIGNIFICANT issues', () => {
    const result = generateFallbackConsequence('FINANCIAL', 'SIGNIFICANT')
    expect(result).toContain('negotiate')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('includes tier modifier for OPTIMIZATION issues', () => {
    const result = generateFallbackConsequence('FINANCIAL', 'OPTIMIZATION')
    expect(result).toContain('improvement')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('falls back to FINANCIAL when category is unknown', () => {
    const result = generateFallbackConsequence('UNKNOWN_CATEGORY', null)
    expect(result).toContain('valuation')
    expect(result.length).toBeLessThanOrEqual(200)
  })

  it('truncates combined text to 200 characters', () => {
    const result = generateFallbackConsequence('FINANCIAL', 'CRITICAL')
    expect(result.length).toBeLessThanOrEqual(200)
  })
})

// ─── Tests: generateBuyerConsequences ───────────────────────────────────

describe('generateBuyerConsequences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zero counts when all tasks already have consequences', async () => {
    const tasks = [
      makeTask({ buyerConsequence: 'Already has one' }),
    ]

    const result = await generateBuyerConsequences('company-1', tasks)

    expect(result.updated).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockGenerateJSON).not.toHaveBeenCalled()
  })

  it('uses AI when dossier context is available', async () => {
    // Setup dossier
    mockPrisma.companyDossier.findFirst.mockResolvedValue({
      id: 'dossier-1',
      content: MOCK_DOSSIER_CONTENT,
    } as never)

    // Setup AI response
    mockGenerateJSON.mockResolvedValue({
      data: {
        consequences: [
          {
            taskId: 'task-1',
            buyerConsequence: 'A buyer will see unpredictable revenue as a high-risk signal.',
          },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const tasks = [makeTask()]
    const result = await generateBuyerConsequences('company-1', tasks)

    expect(result.updated).toBe(1)
    expect(result.failed).toBe(0)
    expect(mockGenerateJSON).toHaveBeenCalledOnce()
    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { buyerConsequence: 'A buyer will see unpredictable revenue as a high-risk signal.' },
    })
  })

  it('logs AI generation to AIGenerationLog', async () => {
    mockPrisma.companyDossier.findFirst.mockResolvedValue({
      id: 'dossier-1',
      content: MOCK_DOSSIER_CONTENT,
    } as never)

    mockGenerateJSON.mockResolvedValue({
      data: { consequences: [{ taskId: 'task-1', buyerConsequence: 'Test consequence' }] },
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await generateBuyerConsequences('company-1', [makeTask()])

    expect(mockPrisma.aIGenerationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        generationType: 'buyer_consequences',
        modelUsed: 'claude-haiku',
        inputTokens: 100,
        outputTokens: 50,
      }),
    })
  })

  it('falls back to rules when AI fails', async () => {
    mockPrisma.companyDossier.findFirst.mockResolvedValue({
      id: 'dossier-1',
      content: MOCK_DOSSIER_CONTENT,
    } as never)

    mockGenerateJSON.mockRejectedValue(new Error('API rate limit'))

    const tasks = [makeTask()]
    const result = await generateBuyerConsequences('company-1', tasks)

    // Should still update with fallback
    expect(result.updated).toBeGreaterThanOrEqual(1)
    expect(mockPrisma.task.update).toHaveBeenCalled()

    // Should log the error
    expect(mockPrisma.aIGenerationLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        errorMessage: 'API rate limit',
        generationType: 'buyer_consequences',
      }),
    })
  })

  it('falls back to rules when no company context is available', async () => {
    mockPrisma.companyDossier.findFirst.mockResolvedValue(null)
    mockPrisma.company.findUnique.mockResolvedValue(null)

    const tasks = [makeTask()]
    const result = await generateBuyerConsequences('company-1', tasks)

    expect(result.updated).toBe(1)
    expect(mockGenerateJSON).not.toHaveBeenCalled()
    expect(mockPrisma.task.update).toHaveBeenCalled()
  })

  it('handles partial AI response — fills missing with fallbacks', async () => {
    mockPrisma.companyDossier.findFirst.mockResolvedValue({
      id: 'dossier-1',
      content: MOCK_DOSSIER_CONTENT,
    } as never)

    // AI returns consequence for task-1 but not task-2
    mockGenerateJSON.mockResolvedValue({
      data: {
        consequences: [
          { taskId: 'task-1', buyerConsequence: 'AI generated this one' },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    const tasks = [
      makeTask({ id: 'task-1' }),
      makeTask({ id: 'task-2', briCategory: 'OPERATIONAL' }),
    ]

    const result = await generateBuyerConsequences('company-1', tasks)

    expect(result.updated).toBe(1) // AI result applied
    expect(result.failed).toBe(1) // Missing one got fallback
    expect(mockPrisma.task.update).toHaveBeenCalledTimes(2)
  })

  it('truncates AI-generated consequences to 200 characters', async () => {
    mockPrisma.companyDossier.findFirst.mockResolvedValue({
      id: 'dossier-1',
      content: MOCK_DOSSIER_CONTENT,
    } as never)

    const longConsequence = 'A'.repeat(250)
    mockGenerateJSON.mockResolvedValue({
      data: {
        consequences: [
          { taskId: 'task-1', buyerConsequence: longConsequence },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    })

    await generateBuyerConsequences('company-1', [makeTask()])

    expect(mockPrisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { buyerConsequence: expect.any(String) },
    })

    const updateCall = mockPrisma.task.update.mock.calls[0][0]
    expect((updateCall.data.buyerConsequence as string).length).toBeLessThanOrEqual(200)
  })

  it('batches large task sets into groups of 15', async () => {
    mockPrisma.companyDossier.findFirst.mockResolvedValue({
      id: 'dossier-1',
      content: MOCK_DOSSIER_CONTENT,
    } as never)

    // Create 20 tasks
    const tasks = Array.from({ length: 20 }, (_, i) =>
      makeTask({ id: `task-${i}` })
    )

    // AI returns consequences for each batch
    mockGenerateJSON.mockImplementation(async () => ({
      data: {
        consequences: Array.from({ length: 15 }, (_, i) => ({
          taskId: `task-${i}`,
          buyerConsequence: `Consequence for task ${i}`,
        })),
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    }))

    await generateBuyerConsequences('company-1', tasks)

    // Should be called twice (15 + 5)
    expect(mockGenerateJSON).toHaveBeenCalledTimes(2)
  })

  it('uses company DB data when dossier is not available', async () => {
    mockPrisma.companyDossier.findFirst.mockResolvedValue(null)
    mockPrisma.company.findUnique.mockResolvedValue({
      name: 'Test Corp',
      icbIndustry: 'Healthcare',
      icbSubSector: 'Pharma',
      businessDescription: 'Drug manufacturing',
    } as never)
    mockPrisma.financialPeriod.findFirst.mockResolvedValue({
      revenue: 3_000_000,
      adjustedEbitda: 800_000,
    } as never)

    mockGenerateJSON.mockResolvedValue({
      data: {
        consequences: [
          { taskId: 'task-1', buyerConsequence: 'AI generated with DB context' },
        ],
      },
      usage: { inputTokens: 80, outputTokens: 40 },
    })

    await generateBuyerConsequences('company-1', [makeTask()])

    expect(mockGenerateJSON).toHaveBeenCalledOnce()
    // Verify the prompt contains company data
    const [prompt] = mockGenerateJSON.mock.calls[0]
    expect(prompt).toContain('Test Corp')
    expect(prompt).toContain('Healthcare')
  })
})
