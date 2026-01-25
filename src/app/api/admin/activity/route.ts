import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, isAdminError, getAuditLogs, exportAuditLogsToCSV } from '@/lib/admin'
import type { AuditLogFilters } from '@/lib/admin'
import { sanitizePagination } from '@/lib/security/validation'

export async function GET(request: NextRequest) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const searchParams = request.nextUrl.searchParams
  // SECURITY: Validate pagination to prevent DoS
  const { page, limit } = sanitizePagination({
    page: searchParams.get('page'),
    limit: searchParams.get('limit') || '50',
  })
  const format = searchParams.get('format') || 'json'

  const filters: AuditLogFilters = {}

  if (searchParams.get('actorId')) {
    filters.actorId = searchParams.get('actorId')!
  }
  if (searchParams.get('action')) {
    filters.action = searchParams.get('action')!
  }
  if (searchParams.get('targetType')) {
    filters.targetType = searchParams.get('targetType') as AuditLogFilters['targetType']
  }
  if (searchParams.get('targetId')) {
    filters.targetId = searchParams.get('targetId')!
  }
  if (searchParams.get('startDate')) {
    filters.startDate = new Date(searchParams.get('startDate')!)
  }
  if (searchParams.get('endDate')) {
    filters.endDate = new Date(searchParams.get('endDate')!)
  }

  // Export to CSV
  if (format === 'csv') {
    const csvContent = await exportAuditLogsToCSV(filters)
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  }

  // Return JSON
  const data = await getAuditLogs({ filters, page, limit })
  return NextResponse.json(data)
}
