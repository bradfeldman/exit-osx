import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { calculateFunnelMetrics, getPipelineSummary } from '@/lib/deal-tracker/funnel-metrics'

/**
 * GET /api/companies/[id]/deal-tracker/analytics
 * Get funnel metrics and pipeline analytics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'full' // 'full' | 'summary'

    if (type === 'summary') {
      const summary = await getPipelineSummary(companyId)
      return NextResponse.json({ summary })
    }

    const metrics = await calculateFunnelMetrics(companyId)
    const summary = await getPipelineSummary(companyId)

    return NextResponse.json({
      metrics,
      summary,
    })
  } catch (error) {
    console.error('Error fetching analytics:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
