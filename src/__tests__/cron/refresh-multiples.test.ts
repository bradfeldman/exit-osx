// @ts-nocheck
/**
 * Tests for Monthly Industry Multiple Refresh Cron
 * Tests the /api/cron/refresh-multiples endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/cron/refresh-multiples/route'
import { prisma } from '@/lib/prisma'
import { recalculateSnapshotForCompany } from '@/lib/valuation/recalculate-snapshot'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    industryMultiple: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    company: {
      findMany: vi.fn(),
    },
    signal: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/valuation/recalculate-snapshot', () => ({
  recalculateSnapshotForCompany: vi.fn(),
}))

vi.mock('@/lib/security/cron-auth', () => ({
  verifyCronAuth: vi.fn(() => null), // Always allow in tests
}))

describe('Refresh Multiples Cron Job', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success when no recent multiples exist', async () => {
    vi.mocked(prisma.industryMultiple.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.multiplesUpdated).toBe(0)
    expect(data.companiesRecalculated).toBe(0)
    expect(data.signalsCreated).toBe(0)
  })

  it('should detect significant multiple changes (>10%)', async () => {
    const subsector = 'Software & Computer Services'

    // Mock recent multiple (new)
    const newMultiple = {
      id: 'new-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 6.0,
      ebitdaMultipleHigh: 10.0,
      revenueMultipleLow: 2.0,
      revenueMultipleHigh: 4.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-02-01'),
      source: 'Market Update',
    }

    // Mock previous multiple (old)
    const oldMultiple = {
      id: 'old-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 5.0,
      ebitdaMultipleHigh: 8.0,
      revenueMultipleLow: 1.5,
      revenueMultipleHigh: 3.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-01-01'),
      source: 'Market Update',
    }

    vi.mocked(prisma.industryMultiple.findMany).mockResolvedValue([newMultiple])
    vi.mocked(prisma.industryMultiple.findFirst).mockResolvedValue(oldMultiple)

    // Mock affected company
    const company = {
      id: 'company-1',
      name: 'Test Company',
      icbSubSector: subsector,
    }
    vi.mocked(prisma.company.findMany).mockResolvedValue([company])

    // Mock successful recalculation
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValue({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: company.id,
      companyName: company.name,
    })

    // Mock signal creation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.signal.create).mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.multiplesUpdated).toBe(1)
    expect(data.companiesRecalculated).toBe(1)
    expect(data.significantChanges).toBe(1)

    // Verify signal was created for significant change
    expect(data.signalsCreated).toBe(1)
    expect(prisma.signal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: company.id,
          eventType: 'MARKET_MULTIPLE_CHANGE',
          severity: 'HIGH', // 33% change (>20%)
          category: 'MARKET',
        }),
      })
    )
  })

  it('should create HIGH severity signal for >20% change', async () => {
    const subsector = 'Software & Computer Services'

    const newMultiple = {
      id: 'new-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 8.0,
      ebitdaMultipleHigh: 12.0,
      revenueMultipleLow: 3.0,
      revenueMultipleHigh: 5.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-02-01'),
      source: 'Market Update',
    }

    const oldMultiple = {
      id: 'old-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 5.0,
      ebitdaMultipleHigh: 8.0,
      revenueMultipleLow: 1.5,
      revenueMultipleHigh: 3.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-01-01'),
      source: 'Market Update',
    }

    vi.mocked(prisma.industryMultiple.findMany).mockResolvedValue([newMultiple])
    vi.mocked(prisma.industryMultiple.findFirst).mockResolvedValue(oldMultiple)

    const company = {
      id: 'company-1',
      name: 'Test Company',
      icbSubSector: subsector,
    }
    vi.mocked(prisma.company.findMany).mockResolvedValue([company])
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValue({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: company.id,
      companyName: company.name,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.signal.create).mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const _data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.signal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          severity: 'HIGH', // 50% change
        }),
      })
    )
  })

  it('should not create signals for changes <10%', async () => {
    const subsector = 'Software & Computer Services'

    const newMultiple = {
      id: 'new-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 5.5,
      ebitdaMultipleHigh: 8.5,
      revenueMultipleLow: 1.6,
      revenueMultipleHigh: 3.2,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-02-01'),
      source: 'Market Update',
    }

    const oldMultiple = {
      id: 'old-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 5.0,
      ebitdaMultipleHigh: 8.0,
      revenueMultipleLow: 1.5,
      revenueMultipleHigh: 3.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-01-01'),
      source: 'Market Update',
    }

    vi.mocked(prisma.industryMultiple.findMany).mockResolvedValue([newMultiple])
    vi.mocked(prisma.industryMultiple.findFirst).mockResolvedValue(oldMultiple)

    const company = {
      id: 'company-1',
      name: 'Test Company',
      icbSubSector: subsector,
    }
    vi.mocked(prisma.company.findMany).mockResolvedValue([company])
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValue({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: company.id,
      companyName: company.name,
    })

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.companiesRecalculated).toBe(1) // Still recalculates
    expect(data.signalsCreated).toBe(0) // But no signal created
    expect(prisma.signal.create).not.toHaveBeenCalled()
  })

  it('should recalculate for new industries (no previous multiple)', async () => {
    const subsector = 'Emerging Industry'

    const newMultiple = {
      id: 'new-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 5.0,
      ebitdaMultipleHigh: 8.0,
      revenueMultipleLow: 1.5,
      revenueMultipleHigh: 3.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-02-01'),
      source: 'Market Update',
    }

    vi.mocked(prisma.industryMultiple.findMany).mockResolvedValue([newMultiple])
    vi.mocked(prisma.industryMultiple.findFirst).mockResolvedValue(null) // No previous

    const company = {
      id: 'company-1',
      name: 'Test Company',
      icbSubSector: subsector,
    }
    vi.mocked(prisma.company.findMany).mockResolvedValue([company])
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValue({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: company.id,
      companyName: company.name,
    })

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.companiesRecalculated).toBe(1)
    expect(recalculateSnapshotForCompany).toHaveBeenCalledWith(
      company.id,
      'Monthly industry multiple refresh',
      undefined
    )
  })

  it('should handle recalculation failures gracefully', async () => {
    const subsector = 'Software & Computer Services'

    const newMultiple = {
      id: 'new-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 5.0,
      ebitdaMultipleHigh: 8.0,
      revenueMultipleLow: 1.5,
      revenueMultipleHigh: 3.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-02-01'),
      source: 'Market Update',
    }

    vi.mocked(prisma.industryMultiple.findMany).mockResolvedValue([newMultiple])
    vi.mocked(prisma.industryMultiple.findFirst).mockResolvedValue(null)

    const companies = [
      { id: 'company-1', name: 'Test Company 1', icbSubSector: subsector },
      { id: 'company-2', name: 'Test Company 2', icbSubSector: subsector },
    ]
    vi.mocked(prisma.company.findMany).mockResolvedValue(companies)

    // First company succeeds, second fails
    vi.mocked(recalculateSnapshotForCompany)
      .mockResolvedValueOnce({
        success: true,
        snapshotId: 'snapshot-1',
        companyId: companies[0].id,
        companyName: companies[0].name,
      })
      .mockResolvedValueOnce({
        success: false,
        error: 'No assessment responses found',
        companyId: companies[1].id,
        companyName: companies[1].name,
      })

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.companiesRecalculated).toBe(1)
    expect(data.companiesFailed).toBe(1)
    expect(data.errors).toBeDefined()
    expect(data.errors).toHaveLength(1)
    expect(data.errors[0]).toEqual({
      companyId: companies[1].id,
      error: 'No assessment responses found',
    })
  })

  it('should handle multiple subsectors with different change levels', async () => {
    const subsector1 = 'Software'
    const subsector2 = 'Manufacturing'

    // Subsector 1: Significant change (>10%)
    const newMultiple1 = {
      id: 'new-1',
      icbSubSector: subsector1,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 6.0,
      ebitdaMultipleHigh: 10.0,
      revenueMultipleLow: 2.0,
      revenueMultipleHigh: 4.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-02-01'),
      source: 'Market Update',
    }

    const oldMultiple1 = {
      id: 'old-1',
      icbSubSector: subsector1,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 5.0,
      ebitdaMultipleHigh: 8.0,
      revenueMultipleLow: 1.5,
      revenueMultipleHigh: 3.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-01-01'),
      source: 'Market Update',
    }

    // Subsector 2: Minor change (<10%)
    const newMultiple2 = {
      id: 'new-2',
      icbSubSector: subsector2,
      icbSector: 'Industrials',
      icbSuperSector: 'Industrials',
      icbIndustry: 'Industrials',
      ebitdaMultipleLow: 4.2,
      ebitdaMultipleHigh: 6.3,
      revenueMultipleLow: 1.0,
      revenueMultipleHigh: 2.1,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-02-01'),
      source: 'Market Update',
    }

    const oldMultiple2 = {
      id: 'old-2',
      icbSubSector: subsector2,
      icbSector: 'Industrials',
      icbSuperSector: 'Industrials',
      icbIndustry: 'Industrials',
      ebitdaMultipleLow: 4.0,
      ebitdaMultipleHigh: 6.0,
      revenueMultipleLow: 1.0,
      revenueMultipleHigh: 2.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-01-01'),
      source: 'Market Update',
    }

    vi.mocked(prisma.industryMultiple.findMany).mockResolvedValue([newMultiple1, newMultiple2])
    vi.mocked(prisma.industryMultiple.findFirst)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(async (args: any) => {
        if (args?.where?.icbSubSector === subsector1) return oldMultiple1
        if (args?.where?.icbSubSector === subsector2) return oldMultiple2
        return null
      })

    const companies = [
      { id: 'company-1', name: 'Tech Co', icbSubSector: subsector1 },
      { id: 'company-2', name: 'Mfg Co', icbSubSector: subsector2 },
    ]
    vi.mocked(prisma.company.findMany).mockResolvedValue(companies)
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValue({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: 'company-1',
      companyName: 'Test',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.signal.create).mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/cron/refresh-multiples')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.companiesRecalculated).toBe(2)
    expect(data.significantChanges).toBe(1) // Only subsector1
    expect(data.signalsCreated).toBe(1) // Only for significant change
  })

  it('should handle signal creation failures gracefully', async () => {
    const subsector = 'Software'

    const newMultiple = {
      id: 'new-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 6.0,
      ebitdaMultipleHigh: 10.0,
      revenueMultipleLow: 2.0,
      revenueMultipleHigh: 4.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-02-01'),
      source: 'Market Update',
    }

    const oldMultiple = {
      id: 'old-multiple',
      icbSubSector: subsector,
      icbSector: 'Technology',
      icbSuperSector: 'Technology',
      icbIndustry: 'Technology',
      ebitdaMultipleLow: 5.0,
      ebitdaMultipleHigh: 8.0,
      revenueMultipleLow: 1.5,
      revenueMultipleHigh: 3.0,
      ebitdaMarginLow: null,
      ebitdaMarginHigh: null,
      effectiveDate: new Date('2025-01-01'),
      source: 'Market Update',
    }

    vi.mocked(prisma.industryMultiple.findMany).mockResolvedValue([newMultiple])
    vi.mocked(prisma.industryMultiple.findFirst).mockResolvedValue(oldMultiple)

    const company = {
      id: 'company-1',
      name: 'Test Company',
      icbSubSector: subsector,
    }
    vi.mocked(prisma.company.findMany).mockResolvedValue([company])
    vi.mocked(recalculateSnapshotForCompany).mockResolvedValue({
      success: true,
      snapshotId: 'snapshot-1',
      companyId: company.id,
      companyName: company.name,
    })

    // Signal creation fails
    vi.mocked(prisma.signal.create).mockRejectedValue(new Error('Signal creation failed'))

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
