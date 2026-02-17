import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/companies/[id]/dataroom/analytics/export
 * Export activity logs as CSV for audit purposes
 *
 * Query params:
 * - type: 'all' (default) | 'views' | 'downloads'
 * - userId: filter by specific user
 * - documentId: filter by specific document
 * - startDate: ISO date string
 * - endDate: ISO date string
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
    const type = searchParams.get('type') || 'all'
    const userId = searchParams.get('userId')
    const documentId = searchParams.get('documentId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    // Build where clause
    const where: Record<string, unknown> = {
      dataRoomId: dataRoom.id,
    }

    // Filter by action type
    if (type === 'views') {
      where.action = 'VIEWED_DOCUMENT'
    } else if (type === 'downloads') {
      where.action = 'DOWNLOADED_DOCUMENT'
    } else {
      where.action = { in: ['VIEWED_DOCUMENT', 'DOWNLOADED_DOCUMENT'] }
    }

    if (userId) where.userId = userId
    if (documentId) where.documentId = documentId

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
    }

    // Fetch all matching activities
    const activities = await prisma.dataRoomActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        userId: true,
        userEmail: true,
        documentId: true,
        folderId: true,
        createdAt: true,
        metadata: true,
      },
    })

    // Get document details
    const docIds = [...new Set(activities.map((a) => a.documentId).filter(Boolean))] as string[]
    const documents = await prisma.dataRoomDocument.findMany({
      where: { id: { in: docIds } },
      select: {
        id: true,
        documentName: true,
        fileName: true,
        folder: { select: { name: true, category: true } },
      },
    })
    const docMap = new Map(documents.map((d) => [d.id, d]))

    // Get user details
    const userIds = [...new Set(activities.map((a) => a.userId).filter(Boolean))] as string[]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    // Build CSV content
    const headers = [
      'Timestamp',
      'Action',
      'User Email',
      'User Name',
      'Document Name',
      'File Name',
      'Folder',
      'Category',
    ]

    const rows = activities.map((activity) => {
      const doc = activity.documentId ? docMap.get(activity.documentId) : null
      const user = activity.userId ? userMap.get(activity.userId) : null

      return [
        activity.createdAt.toISOString(),
        activity.action === 'VIEWED_DOCUMENT' ? 'View' : 'Download',
        user?.email || activity.userEmail,
        user?.name || '',
        doc?.documentName || '',
        doc?.fileName || '',
        doc?.folder?.name || '',
        doc?.folder?.category || '',
      ]
    })

    // Convert to CSV
    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return '""'
      let stringValue = String(value)
      // Prevent CSV formula injection: prefix formula-triggering characters
      if (/^[=+\-@\t\r]/.test(stringValue)) {
        stringValue = "'" + stringValue
      }
      return `"${stringValue.replace(/"/g, '""')}"`
    }

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n')

    // Generate filename with date range
    const now = new Date()
    const filename = `data-room-activity-${now.toISOString().split('T')[0]}.csv`

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting analytics:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
