import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PersonalizationContext } from '@/lib/tasks/personalization-context'
import type { CompanyContextData } from '@/lib/playbook/rich-task-description'

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
    company: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    financialPeriod: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    valuationSnapshot: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    companyDossier: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    aIGenerationLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('@/lib/valuation/industry-multiples', () => ({
  getIndustryMultiples: vi.fn().mockResolvedValue(null),
}))

// ─── Import after mocks ────────────────────────────────────────────────

import { generateJSON } from '@/lib/ai/anthropic'
import { prisma } from '@/lib/prisma'
import { getIndustryMultiples } from '@/lib/valuation/industry-multiples'
import { gatherTaskPersonalizationContext } from '@/lib/tasks/personalization-context'
import { enrichTasksWithContext } from '@/lib/tasks/enrich-task-context'

const mockGenerateJSON = vi.mocked(generateJSON)
const mockGetIndustryMultiples = vi.mocked(getIndustryMultiples)

// ─── Helpers ────────────────────────────────────────────────────────────

function makeCompany(overrides: Record<string, unknown> = {}) {
  return {
    name: 'TestCo',
    icbIndustry: 'Technology',
    icbSuperSector: 'Technology',
    icbSector: 'Software',
    icbSubSector: 'Application Software',
    businessDescription: 'A test company',
    coreFactors: {
      revenueModel: 'Recurring',
      ownerInvolvement: 'Low',
      laborIntensity: 'Low',
      assetIntensity: 'Low',
      grossMarginProxy: 'High',
    },
    ...overrides,
  }
}

function makeIncomeStatement() {
  return {
    grossRevenue: 2000000,
    cogs: 800000,
    grossMarginPct: 0.6,
    ebitda: 400000,
    ebitdaMarginPct: 0.2,
  }
}

function makeBenchmarks(overrides: Record<string, unknown> = {}) {
  return {
    ebitdaMultipleLow: 4,
    ebitdaMultipleHigh: 8,
    revenueMultipleLow: 1,
    revenueMultipleHigh: 3,
    ebitdaMarginLow: 15,
    ebitdaMarginHigh: 30,
    source: 'Test source',
    isDefault: false,
    matchLevel: 'subsector' as const,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Tier Determination Tests ───────────────────────────────────────────

describe('gatherTaskPersonalizationContext — tier determination', () => {
  it('returns HIGH when financials + benchmarks are present', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(makeCompany() as never)
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue({
      label: 'FY2025',
      fiscalYear: 2025,
      incomeStatement: makeIncomeStatement(),
    } as never)
    mockGetIndustryMultiples.mockResolvedValue(makeBenchmarks())
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({ valueGap: 500000 } as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)

    const ctx = await gatherTaskPersonalizationContext('company-1')

    expect(ctx).not.toBeNull()
    expect(ctx!.tier).toBe('HIGH')
    expect(ctx!.financials).not.toBeNull()
    expect(ctx!.benchmarks).not.toBeNull()
  })

  it('returns MODERATE when coreFactors + benchmarks but no income', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(makeCompany() as never)
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(null as never)
    mockGetIndustryMultiples.mockResolvedValue(makeBenchmarks())
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({ valueGap: 0 } as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)

    const ctx = await gatherTaskPersonalizationContext('company-1')

    expect(ctx).not.toBeNull()
    expect(ctx!.tier).toBe('MODERATE')
    expect(ctx!.financials).toBeNull()
    expect(ctx!.benchmarks).not.toBeNull()
  })

  it('returns LOW when no financials and no benchmarks', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      makeCompany({ coreFactors: null }) as never
    )
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(null as never)
    mockGetIndustryMultiples.mockResolvedValue(null as never)
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)

    const ctx = await gatherTaskPersonalizationContext('company-1')

    expect(ctx).not.toBeNull()
    expect(ctx!.tier).toBe('LOW')
    expect(ctx!.financials).toBeNull()
    expect(ctx!.benchmarks).toBeNull()
  })

  it('returns null when company not found', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(null as never)

    const ctx = await gatherTaskPersonalizationContext('nonexistent')

    expect(ctx).toBeNull()
  })
})

// ─── Null Benchmarks Edge Cases ─────────────────────────────────────────

describe('gatherTaskPersonalizationContext — null benchmarks', () => {
  it('returns MODERATE/LOW (not HIGH) when benchmarks are default', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(makeCompany() as never)
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue({
      label: 'FY2025',
      fiscalYear: 2025,
      incomeStatement: makeIncomeStatement(),
    } as never)
    // Default benchmarks have isDefault: true — should be filtered out
    mockGetIndustryMultiples.mockResolvedValue(makeBenchmarks({ isDefault: true }))
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({ valueGap: 0 } as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)

    const ctx = await gatherTaskPersonalizationContext('company-1')

    expect(ctx).not.toBeNull()
    // Has income but benchmarks are default → benchmarks treated as null → LOW
    expect(ctx!.tier).not.toBe('HIGH')
    expect(ctx!.benchmarks).toBeNull()
  })

  it('returns LOW when benchmarks have zero EBITDA margin', async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue(makeCompany() as never)
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue({
      label: 'FY2025',
      fiscalYear: 2025,
      incomeStatement: makeIncomeStatement(),
    } as never)
    mockGetIndustryMultiples.mockResolvedValue(
      makeBenchmarks({ ebitdaMarginLow: 0, ebitdaMarginHigh: 0 })
    )
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({ valueGap: 0 } as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)

    const ctx = await gatherTaskPersonalizationContext('company-1')

    expect(ctx).not.toBeNull()
    // hasBenchmarks requires ebitdaMarginLow > 0, so this is LOW
    expect(ctx!.tier).not.toBe('HIGH')
  })
})

// ─── Rule-Based Fallback Tests ──────────────────────────────────────────

describe('enrichTasksWithContext — rule-based fallback', () => {
  const mockTasks = [
    {
      id: 'task-1',
      title: 'Test Task',
      description: 'A task',
      briCategory: 'FINANCIAL',
      richDescription: {},
    },
  ]

  it('applies LOW tier context directly without AI call', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      makeCompany({ coreFactors: null }) as never
    )
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(null as never)
    mockGetIndustryMultiples.mockResolvedValue(null as never)
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)

    const result = await enrichTasksWithContext('company-1')

    expect(result.updated).toBe(1)
    expect(result.failed).toBe(0)
    // Should NOT have called AI
    expect(mockGenerateJSON).not.toHaveBeenCalled()
    // Should have updated the task
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'task-1' },
        data: expect.objectContaining({
          richDescription: expect.objectContaining({
            companyContext: expect.objectContaining({
              dataQuality: 'LOW',
              addFinancialsCTA: true,
            }),
          }),
        }),
      })
    )
  })

  it('falls back to rule-based when AI call fails', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(makeCompany() as never)
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue({
      label: 'FY2025',
      fiscalYear: 2025,
      incomeStatement: makeIncomeStatement(),
    } as never)
    mockGetIndustryMultiples.mockResolvedValue(makeBenchmarks())
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({ valueGap: 500000 } as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)
    // AI call throws
    mockGenerateJSON.mockRejectedValue(new Error('AI service unavailable'))

    const result = await enrichTasksWithContext('company-1')

    expect(result.updated).toBe(1)
    expect(result.failed).toBe(0)
    // Should have attempted AI
    expect(mockGenerateJSON).toHaveBeenCalledTimes(1)
    // Should have saved a rule-based fallback context
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          richDescription: expect.objectContaining({
            companyContext: expect.objectContaining({
              dataQuality: 'HIGH',
              addFinancialsCTA: false,
            }),
          }),
        }),
      })
    )
  })
})

// ─── CompanyContextData Shape Tests ─────────────────────────────────────

describe('rule-based CompanyContextData shape', () => {
  it('HIGH tier has correct shape with all fields', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([
      { id: 't-1', title: 'T', description: 'D', briCategory: 'FINANCIAL', richDescription: {} },
    ] as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(makeCompany() as never)
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue({
      label: 'FY2025',
      fiscalYear: 2025,
      incomeStatement: makeIncomeStatement(),
    } as never)
    mockGetIndustryMultiples.mockResolvedValue(makeBenchmarks())
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({ valueGap: 100000 } as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)
    // AI fails → rule-based
    mockGenerateJSON.mockRejectedValue(new Error('fail'))

    await enrichTasksWithContext('company-1')

    const updateCall = vi.mocked(prisma.task.update).mock.calls[0][0]
    const ctx = (updateCall.data.richDescription as unknown as { companyContext: CompanyContextData }).companyContext

    expect(ctx).toMatchObject({
      yourSituation: {
        metric: expect.any(String),
        value: expect.any(String),
        source: expect.any(String),
      },
      industryBenchmark: {
        range: expect.any(String),
        source: expect.any(String),
      },
      financialImpact: {
        gapDescription: expect.any(String),
        dollarImpact: expect.any(String),
        enterpriseValueImpact: expect.any(String),
        calculation: expect.any(String),
      },
      contextNote: expect.any(String),
      dataQuality: 'HIGH',
      addFinancialsCTA: false,
    })
  })

  it('MODERATE tier sets addFinancialsCTA true', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([
      { id: 't-1', title: 'T', description: 'D', briCategory: 'FINANCIAL', richDescription: {} },
    ] as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(makeCompany() as never)
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(null as never)
    mockGetIndustryMultiples.mockResolvedValue(makeBenchmarks())
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({ valueGap: 0 } as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)
    // AI fails → rule-based
    mockGenerateJSON.mockRejectedValue(new Error('fail'))

    await enrichTasksWithContext('company-1')

    const updateCall = vi.mocked(prisma.task.update).mock.calls[0][0]
    const ctx = (updateCall.data.richDescription as unknown as { companyContext: CompanyContextData }).companyContext

    expect(ctx.dataQuality).toBe('MODERATE')
    expect(ctx.addFinancialsCTA).toBe(true)
    expect(ctx.financialImpact).toBeNull()
  })

  it('LOW tier sets addFinancialsCTA true and nulls benchmarks/impact', async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([
      { id: 't-1', title: 'T', description: 'D', briCategory: 'FINANCIAL', richDescription: {} },
    ] as never)
    vi.mocked(prisma.company.findUnique).mockResolvedValue(
      makeCompany({ coreFactors: null }) as never
    )
    vi.mocked(prisma.financialPeriod.findFirst).mockResolvedValue(null as never)
    mockGetIndustryMultiples.mockResolvedValue(null as never)
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.companyDossier.findFirst).mockResolvedValue(null as never)

    await enrichTasksWithContext('company-1')

    const updateCall = vi.mocked(prisma.task.update).mock.calls[0][0]
    const ctx = (updateCall.data.richDescription as unknown as { companyContext: CompanyContextData }).companyContext

    expect(ctx.dataQuality).toBe('LOW')
    expect(ctx.addFinancialsCTA).toBe(true)
    expect(ctx.industryBenchmark).toBeNull()
    expect(ctx.financialImpact).toBeNull()
  })
})
