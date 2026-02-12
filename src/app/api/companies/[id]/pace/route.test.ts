import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from './route'
import { prisma } from '@/lib/prisma'

vi.mock('@/lib/auth/check-permission', () => ({
  checkPermission: vi.fn().mockResolvedValue({
    auth: { user: { id: 'user1' }, workspaceMember: { workspaceId: 'org1' } },
  }),
  isAuthError: vi.fn().mockReturnValue(false),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    valuationSnapshot: {
      findFirst: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
    },
  },
}))

describe('/api/companies/[id]/pace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zero pace when no completed tasks exist', async () => {
    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({
      valueGap: 100000,
    } as never)

    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/companies/comp1/pace')
    const response = await GET(request, {
      params: Promise.resolve({ id: 'comp1' }),
    })

    const data = await response.json()

    expect(data.hasEnoughHistory).toBe(false)
    expect(data.monthlyCompletionRate).toBe(0)
    expect(data.projectedMonthsToClose).toBeNull()
    expect(data.tasksCompleted).toBe(0)
  })

  it('calculates pace correctly with 3+ months of history', async () => {
    // Use fixed dates that are 100 days apart (about 3.3 months)
    const startDate = new Date('2024-01-01T00:00:00Z')
    const endDate = new Date('2024-04-10T00:00:00Z')

    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({
      valueGap: 200000,
    } as never)

    vi.mocked(prisma.task.findMany).mockResolvedValue([
      {
        completedAt: startDate,
        completedValue: 10000,
        normalizedValue: 10000,
      },
      {
        completedAt: new Date('2024-02-01T00:00:00Z'),
        completedValue: 15000,
        normalizedValue: 15000,
      },
      {
        completedAt: new Date('2024-03-01T00:00:00Z'),
        completedValue: 12000,
        normalizedValue: 12000,
      },
      {
        completedAt: endDate,
        completedValue: 13000,
        normalizedValue: 13000,
      },
    ] as never)

    const request = new Request('http://localhost/api/companies/comp1/pace')
    const response = await GET(request, {
      params: Promise.resolve({ id: 'comp1' }),
    })

    const data = await response.json()

    expect(data.hasEnoughHistory).toBe(true)
    expect(data.tasksCompleted).toBe(4)
    expect(data.averageValuePerTask).toBeCloseTo(12500, 0)
    expect(data.monthlyCompletionRate).toBeGreaterThan(0)
    expect(data.projectedMonthsToClose).toBeGreaterThan(0)
  })

  it('handles edge case where value gap is already zero', async () => {
    const now = new Date()
    const fourMonthsAgo = new Date(now)
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4)

    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({
      valueGap: 0,
    } as never)

    vi.mocked(prisma.task.findMany).mockResolvedValue([
      {
        completedAt: fourMonthsAgo,
        completedValue: 10000,
        normalizedValue: 10000,
      },
    ] as never)

    const request = new Request('http://localhost/api/companies/comp1/pace')
    const response = await GET(request, {
      params: Promise.resolve({ id: 'comp1' }),
    })

    const data = await response.json()

    expect(data.remainingValueGap).toBe(0)
    expect(data.projectedMonthsToClose).toBeNull() // Can't project when gap is zero
  })

  it('marks hasEnoughHistory as false when timespan is less than 3 months', async () => {
    const now = new Date()
    const twoMonthsAgo = new Date(now)
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

    vi.mocked(prisma.valuationSnapshot.findFirst).mockResolvedValue({
      valueGap: 50000,
    } as never)

    vi.mocked(prisma.task.findMany).mockResolvedValue([
      {
        completedAt: twoMonthsAgo,
        completedValue: 5000,
        normalizedValue: 5000,
      },
      {
        completedAt: now,
        completedValue: 6000,
        normalizedValue: 6000,
      },
    ] as never)

    const request = new Request('http://localhost/api/companies/comp1/pace')
    const response = await GET(request, {
      params: Promise.resolve({ id: 'comp1' }),
    })

    const data = await response.json()

    expect(data.hasEnoughHistory).toBe(false)
  })
})
