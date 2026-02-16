/**
 * Tests for Monthly Industry Multiple Refresh Cron
 * Tests the /api/cron/refresh-multiples endpoint
 *
 * The route uses AI research to refresh stale industry multiples,
 * recalculates valuations for affected companies, and creates
 * signals for significant changes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/cron/refresh-multiples/route'
import { prisma } from '@/lib/prisma'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'
import { researchMultiples } from '@/lib/valuation/multiple-research-engine'
import { createSignal } from '@/lib/signals/create-signal'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
    },
    industryMultiple: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    valuationSnapshot: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/valuation/recalculate-snapshot', () => ({
  recalculateSnapshotForCompany: vi.fn(),
}))

vi.mock('@/lib/valuation/multiple-research-engine', () => ({
  researchMultiples: vi.fn(),
}))

vi.mock('@/lib/signals/create-signal', () => ({
  createSignal: vi.fn(),
}))

vi.mock('@/lib/security/cron-auth', () => ({
  verifyCronAuth: vi.fn(() => null), // Always allow in tests
}))

// Helper to make a research result
function makeResearchResult(overrides: Record<string, any> = {}) {
  return {
    icbSubSector: 'SOFTWARE',
    gicsSubIndustry: null,
    revenueMultipleLow: 2.0,
    revenueMultipleHigh: 4.0,
    ebitdaMultipleLow: 6.0,
    ebitdaMultipleHigh: 10.0,
    ebitdaMarginLow: 0.15,
    ebitdaMarginHigh: 0.30,
    publicComparables: [
      { name: 'Test Corp', ticker: 'TEST', whyRelevant: 'Similar model', evToEbitda: 8.0, evToRevenue: 2.5, revenue: 100_000_000, ebitdaMargin: 0.20 },
    ],
    methodology: 'AI research',
    confidenceLevel: 'high' as const,
    warnings: [],
    researchedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('Refresh Multiples Cron Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success when no active companies exist', async () => {
    // No active companies → no sub-sectors to research
    vi.mocked(prisma.company.findMany).mockResolvedValueOnce([])

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should skip sub-sectors that were recently researched', async () => {
    const subsector = 'ENTERPRISE_SOFTWARE'

    // One active company
    vi.mocked(prisma.company.findMany).mockResolvedValueOnce([
      { icbSubSector: subsector, gicsSubIndustry: null } as any,
    ])

    // Recent multiple (researched yesterday — not stale)
    vi.mocked(prisma.industryMultiple.findFirst).mockResolvedValueOnce({
      id: 'mult-1',
      icbSubSector: subsector,
      effectiveDate: new Date(),
      lastResearchedAt: new Date(), // Very recent
    } as any)

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // Should recognize all multiples are fresh
    expect(data.researched).toBe(0)
  })

  it('should research stale sub-sectors and recalculate', async () => {
    const subsector = 'ENTERPRISE_SOFTWARE'

    // Active company with sub-sector
    vi.mocked(prisma.company.findMany)
      .mockResolvedValueOnce([
        { icbSubSector: subsector, gicsSubIndustry: null } as any,
      ])
      // Second call: affected companies for recalculation
      .mockResolvedValueOnce([
        { id: 'company-1', name: 'Test Co', icbSubSector: subsector } as any,
      ])

    // Stale multiple (researched 60 days ago)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    vi.mocked(prisma.industryMultiple.findFirst)
      // First call: check staleness
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        lastResearchedAt: sixtyDaysAgo,
        effectiveDate: sixtyDaysAgo,
      } as any)
      // Second call: get existing for comparison
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        ebitdaMultipleLow: 5.0,
        ebitdaMultipleHigh: 8.0,
        revenueMultipleLow: 1.5,
        revenueMultipleHigh: 3.0,
        effectiveDate: sixtyDaysAgo,
      } as any)

    // Research returns new multiples (minor change <10%)
    vi.mocked(researchMultiples).mockResolvedValueOnce(
      makeResearchResult({
        ebitdaMultipleLow: 5.2,
        ebitdaMultipleHigh: 8.3,
        revenueMultipleLow: 1.6,
        revenueMultipleHigh: 3.1,
      })
    )

    // Mock create
    vi.mocked(prisma.industryMultiple.create).mockResolvedValueOnce({} as any)

    // Mock recalculation
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValueOnce({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: 'company-1',
      companyName: 'Test Co',
    })

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.researched).toBe(1)
    expect(data.companiesRecalculated).toBe(1)

    // Verify recalculation was called with correct reason
    expect(recalculateSnapshotForCompany).toHaveBeenCalledWith(
      'company-1',
      'Monthly industry multiple refresh (AI research)',
      undefined
    )
  })

  it('should detect significant changes (>10%) and create signals', async () => {
    const subsector = 'ENTERPRISE_SOFTWARE'

    vi.mocked(prisma.company.findMany)
      .mockResolvedValueOnce([
        { icbSubSector: subsector, gicsSubIndustry: null } as any,
      ])
      .mockResolvedValueOnce([
        { id: 'company-1', name: 'Test Co', icbSubSector: subsector } as any,
      ])

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    vi.mocked(prisma.industryMultiple.findFirst)
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        lastResearchedAt: sixtyDaysAgo,
        effectiveDate: sixtyDaysAgo,
      } as any)
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        ebitdaMultipleLow: 5.0,
        ebitdaMultipleHigh: 8.0,
        revenueMultipleLow: 1.5,
        revenueMultipleHigh: 3.0,
        effectiveDate: sixtyDaysAgo,
      } as any)

    // Research returns significantly different multiples (>10% change)
    vi.mocked(researchMultiples).mockResolvedValueOnce(
      makeResearchResult({
        ebitdaMultipleLow: 7.0,
        ebitdaMultipleHigh: 11.0,
        revenueMultipleLow: 2.5,
        revenueMultipleHigh: 4.5,
      })
    )

    vi.mocked(prisma.industryMultiple.create).mockResolvedValueOnce({} as any)
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValueOnce({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: 'company-1',
      companyName: 'Test Co',
    })
    vi.mocked(prisma.valuationSnapshot.findMany).mockResolvedValueOnce([])
    vi.mocked(createSignal).mockResolvedValueOnce({} as any)

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.significantChanges).toBe(1)
    expect(data.signalsCreated).toBe(1)
    expect(createSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        eventType: 'MARKET_MULTIPLE_CHANGE',
        category: 'MARKET',
      })
    )
  })

  it('should not create signals for minor changes (<10%)', async () => {
    const subsector = 'ENTERPRISE_SOFTWARE'

    vi.mocked(prisma.company.findMany)
      .mockResolvedValueOnce([
        { icbSubSector: subsector, gicsSubIndustry: null } as any,
      ])
      .mockResolvedValueOnce([
        { id: 'company-1', name: 'Test Co', icbSubSector: subsector } as any,
      ])

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    vi.mocked(prisma.industryMultiple.findFirst)
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        lastResearchedAt: sixtyDaysAgo,
        effectiveDate: sixtyDaysAgo,
      } as any)
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        ebitdaMultipleLow: 5.0,
        ebitdaMultipleHigh: 8.0,
        revenueMultipleLow: 1.5,
        revenueMultipleHigh: 3.0,
        effectiveDate: sixtyDaysAgo,
      } as any)

    // Research returns very similar multiples (<10% change)
    vi.mocked(researchMultiples).mockResolvedValueOnce(
      makeResearchResult({
        ebitdaMultipleLow: 5.2,
        ebitdaMultipleHigh: 8.3,
        revenueMultipleLow: 1.55,
        revenueMultipleHigh: 3.1,
      })
    )

    vi.mocked(prisma.industryMultiple.create).mockResolvedValueOnce({} as any)
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValueOnce({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: 'company-1',
      companyName: 'Test Co',
    })

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.companiesRecalculated).toBe(1) // Still recalculates
    expect(data.signalsCreated).toBe(0) // But no signal created
    expect(createSignal).not.toHaveBeenCalled()
  })

  it('should research new sub-sectors with no previous multiples', async () => {
    const subsector = 'EMERGING_TECH'

    vi.mocked(prisma.company.findMany)
      .mockResolvedValueOnce([
        { icbSubSector: subsector, gicsSubIndustry: null } as any,
      ])
      .mockResolvedValueOnce([
        { id: 'company-1', name: 'Test Co', icbSubSector: subsector } as any,
      ])

    // No existing multiple
    vi.mocked(prisma.industryMultiple.findFirst)
      .mockResolvedValueOnce(null) // Staleness check: no multiple exists
      .mockResolvedValueOnce(null) // Comparison check: no previous

    vi.mocked(researchMultiples).mockResolvedValueOnce(
      makeResearchResult({ icbSubSector: subsector })
    )
    vi.mocked(prisma.industryMultiple.create).mockResolvedValueOnce({} as any)
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValueOnce({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: 'company-1',
      companyName: 'Test Co',
    })

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.researched).toBe(1)
    expect(data.companiesRecalculated).toBe(1)
    // No significant change calculated (no previous to compare)
    expect(data.significantChanges).toBe(0)
  })

  it('should handle research failures gracefully', async () => {
    const subsector = 'ENTERPRISE_SOFTWARE'

    vi.mocked(prisma.company.findMany)
      .mockResolvedValueOnce([
        { icbSubSector: subsector, gicsSubIndustry: null } as any,
      ])
      .mockResolvedValueOnce([]) // No affected companies (nothing recalculated)

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    vi.mocked(prisma.industryMultiple.findFirst)
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        lastResearchedAt: sixtyDaysAgo,
        effectiveDate: sixtyDaysAgo,
      } as any)
      .mockResolvedValueOnce(null)

    // Research fails
    vi.mocked(researchMultiples).mockRejectedValueOnce(new Error('AI unavailable'))

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    // Job should still succeed overall
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.researchFailed).toBe(1)
    expect(data.researched).toBe(0)
  })

  it('should handle signal creation failures gracefully', async () => {
    const subsector = 'ENTERPRISE_SOFTWARE'

    vi.mocked(prisma.company.findMany)
      .mockResolvedValueOnce([
        { icbSubSector: subsector, gicsSubIndustry: null } as any,
      ])
      .mockResolvedValueOnce([
        { id: 'company-1', name: 'Test Co', icbSubSector: subsector } as any,
      ])

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    vi.mocked(prisma.industryMultiple.findFirst)
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        lastResearchedAt: sixtyDaysAgo,
        effectiveDate: sixtyDaysAgo,
      } as any)
      .mockResolvedValueOnce({
        id: 'old-mult',
        icbSubSector: subsector,
        ebitdaMultipleLow: 5.0,
        ebitdaMultipleHigh: 8.0,
        revenueMultipleLow: 1.5,
        revenueMultipleHigh: 3.0,
        effectiveDate: sixtyDaysAgo,
      } as any)

    // Significant change
    vi.mocked(researchMultiples).mockResolvedValueOnce(
      makeResearchResult({
        ebitdaMultipleLow: 7.0,
        ebitdaMultipleHigh: 11.0,
        revenueMultipleLow: 2.5,
        revenueMultipleHigh: 4.5,
      })
    )
    vi.mocked(prisma.industryMultiple.create).mockResolvedValueOnce({} as any)
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValueOnce({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: 'company-1',
      companyName: 'Test Co',
    })
    vi.mocked(prisma.valuationSnapshot.findMany).mockResolvedValueOnce([])

    // Signal creation fails
    vi.mocked(createSignal).mockRejectedValueOnce(new Error('Signal creation failed'))

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    // Job should still succeed even if signal creation fails
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.companiesRecalculated).toBe(1)
    expect(data.signalsCreated).toBe(0)
  })
})
