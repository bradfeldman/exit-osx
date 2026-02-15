import { prisma } from '@/lib/prisma'
import { NextResponse, type NextRequest } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import type { LedgerEventType, BriCategory } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category') as BriCategory | null
  const eventType = searchParams.get('eventType') as LedgerEventType | null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const cursor = searchParams.get('cursor')
  const since = searchParams.get('since')

  const where: Record<string, unknown> = { companyId }
  if (category) where.category = category
  if (eventType) where.eventType = eventType
  if (since) where.occurredAt = { gte: new Date(since) }

  try {
    const entries = await prisma.valueLedgerEntry.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        eventType: true,
        category: true,
        deltaValueRecovered: true,
        deltaValueAtRisk: true,
        deltaBri: true,
        narrativeSummary: true,
        occurredAt: true,
        taskId: true,
        signalId: true,
      },
    })

    const hasMore = entries.length > limit
    const trimmed = hasMore ? entries.slice(0, limit) : entries
    const nextCursor = hasMore ? trimmed[trimmed.length - 1].id : null

    // Aggregate summary for the filtered set
    const summary = await prisma.valueLedgerEntry.aggregate({
      where,
      _sum: {
        deltaValueRecovered: true,
        deltaValueAtRisk: true,
      },
      _count: true,
    })

    return NextResponse.json({
      entries: trimmed.map((e) => ({
        ...e,
        deltaValueRecovered: Number(e.deltaValueRecovered),
        deltaValueAtRisk: Number(e.deltaValueAtRisk),
        deltaBri: e.deltaBri ? Number(e.deltaBri) : null,
      })),
      nextCursor,
      summary: {
        totalRecovered: Number(summary._sum.deltaValueRecovered ?? 0),
        totalAtRisk: Number(summary._sum.deltaValueAtRisk ?? 0),
        netImpact:
          Number(summary._sum.deltaValueRecovered ?? 0) -
          Number(summary._sum.deltaValueAtRisk ?? 0),
        entryCount: summary._count,
      },
    })
  } catch (error) {
    console.error('[ValueLedger] Error fetching entries:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch ledger entries' },
      { status: 500 }
    )
  }
}
