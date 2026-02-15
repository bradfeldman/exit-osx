import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params

  try {
    const result = await checkPermission('COMPANY_VIEW', companyId)
    if (isAuthError(result)) return result.error

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const buyerFilter = searchParams.get('buyer')
    const typeFilter = searchParams.get('type')
    const limit = 30

    // Find the active deal
    const deal = await prisma.deal.findFirst({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true },
    })

    if (!deal) {
      return NextResponse.json({ activities: [], hasMore: false, cursor: null })
    }

    // Fetch deal activities (DealActivity2 uses `performedAt` not `createdAt`)
    const dealActivities = await prisma.dealActivity2.findMany({
      where: {
        dealId: deal.id,
        ...(buyerFilter ? { dealBuyerId: buyerFilter } : {}),
        ...(cursor ? { performedAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        dealBuyer: {
          include: {
            canonicalCompany: { select: { name: true } },
          },
        },
        person: { select: { firstName: true, lastName: true } },
      },
      orderBy: { performedAt: 'desc' },
      take: limit + 1,
    })

    // Also fetch data room activities if not filtering by buyer
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
      select: { id: true },
    })

    let dataRoomActivities: Array<{
      id: string
      type: string
      buyerName: string | null
      buyerId: string | null
      contactName: string | null
      description: string
      metadata: Record<string, unknown>
      timestamp: string
      engagementSignal: 'positive' | 'neutral' | 'warning' | null
    }> = []

    if (dataRoom && !buyerFilter) {
      const drActivities = await prisma.dataRoomActivity.findMany({
        where: {
          dataRoomId: dataRoom.id,
          ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
          ...(typeFilter === 'document_view' ? { action: 'VIEWED_DOCUMENT' } : {}),
          ...(typeFilter === 'document_download' ? { action: 'DOWNLOADED_DOCUMENT' } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      // Map data room actions to activity types
      const actionTypeMap: Record<string, string> = {
        VIEWED_DOCUMENT: 'document_view',
        DOWNLOADED_DOCUMENT: 'document_download',
        ASKED_QUESTION: 'question_asked',
        ANSWERED_QUESTION: 'question_answered',
        GRANTED_ACCESS: 'access_change',
        REVOKED_ACCESS: 'access_change',
      }

      dataRoomActivities = drActivities
        .filter(a => actionTypeMap[a.action])
        .map(a => ({
          id: `dr-${a.id}`,
          type: actionTypeMap[a.action] ?? 'note',
          buyerName: null,
          buyerId: null,
          contactName: a.userEmail,
          description: formatDataRoomActivity(a.action, a.userEmail),
          metadata: (a.metadata as Record<string, unknown>) ?? {},
          timestamp: a.createdAt.toISOString(),
          engagementSignal: a.action === 'VIEWED_DOCUMENT' || a.action === 'DOWNLOADED_DOCUMENT'
            ? 'positive' as const
            : 'neutral' as const,
        }))
    }

    // Map deal activities to the unified format
    const activityTypeMap: Record<string, string> = {
      STAGE_CHANGED: 'stage_change',
      MEETING_SCHEDULED: 'meeting',
      MEETING_COMPLETED: 'meeting',
      DOCUMENT_SENT: 'document_view',
      DOCUMENT_RECEIVED: 'document_download',
      NOTE_ADDED: 'note',
      VDR_ACCESS_GRANTED: 'access_change',
      VDR_ACCESS_REVOKED: 'access_change',
    }

    const mappedDealActivities = dealActivities.slice(0, limit).map(a => ({
      id: a.id,
      type: activityTypeMap[a.activityType] ?? 'note',
      buyerName: a.dealBuyer?.canonicalCompany.name ?? null,
      buyerId: a.dealBuyerId,
      contactName: a.person ? `${a.person.firstName} ${a.person.lastName}` : null,
      description: a.subject,
      metadata: (a.metadata as Record<string, unknown>) ?? {},
      timestamp: a.performedAt.toISOString(),
      engagementSignal: mapOutcomeToSignal(a.outcome),
    }))

    // Merge and sort all activities
    const allActivities = [...mappedDealActivities, ...dataRoomActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    // Apply type filter
    const filteredActivities = typeFilter && typeFilter !== 'all'
      ? allActivities.filter(a => a.type === typeFilter)
      : allActivities

    const hasMore = dealActivities.length > limit
    const lastActivity = filteredActivities[filteredActivities.length - 1]

    return NextResponse.json({
      activities: filteredActivities,
      hasMore,
      cursor: lastActivity?.timestamp ?? null,
    })
  } catch (error) {
    console.error('Error fetching deal room activity:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}

function formatDataRoomActivity(action: string, email: string): string {
  switch (action) {
    case 'VIEWED_DOCUMENT':
      return `${email} viewed a document`
    case 'DOWNLOADED_DOCUMENT':
      return `${email} downloaded a document`
    case 'ASKED_QUESTION':
      return `${email} asked a question`
    case 'ANSWERED_QUESTION':
      return `Question answered for ${email}`
    case 'GRANTED_ACCESS':
      return `Access granted to ${email}`
    case 'REVOKED_ACCESS':
      return `Access revoked from ${email}`
    default:
      return `Activity by ${email}`
  }
}

function mapOutcomeToSignal(
  outcome: string | null
): 'positive' | 'neutral' | 'warning' | null {
  if (!outcome) return null
  switch (outcome) {
    case 'POSITIVE':
      return 'positive'
    case 'NEGATIVE':
      return 'warning'
    case 'NO_RESPONSE':
      return 'warning'
    default:
      return 'neutral'
  }
}
