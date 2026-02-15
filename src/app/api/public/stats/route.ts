import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [assessmentCount, valueGapResult] = await Promise.all([
      // Count completed assessments
      prisma.assessment.count({
        where: { completedAt: { not: null } },
      }),

      // Average value gap from the latest snapshot per company.
      // Raw query is cleaner than multiple Prisma calls for this.
      prisma.$queryRaw<[{ avg_gap: number | null }]>`
        SELECT AVG(vg.value_gap)::numeric AS avg_gap
        FROM (
          SELECT DISTINCT ON (company_id) value_gap
          FROM valuation_snapshots
          ORDER BY company_id, created_at DESC
        ) vg
        WHERE vg.value_gap > 0
      `,
    ])

    const avgValueGap = valueGapResult[0]?.avg_gap
      ? Math.round(Number(valueGapResult[0].avg_gap))
      : null

    return NextResponse.json(
      { assessmentCount, avgValueGap },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch public stats:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { assessmentCount: null, avgValueGap: null },
      { status: 500 }
    )
  }
}
