import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteParams = Promise<{ dealId: string; buyerId: string }>

/**
 * GET /api/deals/[dealId]/buyers/[buyerId]/vdr-activity
 * Get VDR activity for a buyer's contacts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const { dealId, buyerId } = await params
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Get buyer with deal and contacts
    const buyer = await prisma.dealBuyer.findUnique({
      where: { id: buyerId },
      include: {
        deal: {
          include: {
            company: {
              include: {
                dataRoom: true
              }
            }
          }
        },
        contacts: {
          where: { isActive: true },
          include: {
            canonicalPerson: {
              select: { email: true }
            },
            dataRoomAccess: true
          }
        }
      }
    })

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer not found' },
        { status: 404 }
      )
    }

    if (buyer.dealId !== dealId) {
      return NextResponse.json(
        { error: 'Buyer does not belong to this deal' },
        { status: 400 }
      )
    }

    // Get the data room
    const dataRoom = buyer.deal.company?.dataRoom
    if (!dataRoom) {
      return NextResponse.json({
        activities: [],
        total: 0
      })
    }

    // Get contact emails for filtering
    const contactEmails = buyer.contacts
      .map(c => c.canonicalPerson.email)
      .filter((email): email is string => email !== null)

    if (contactEmails.length === 0) {
      return NextResponse.json({
        activities: [],
        total: 0
      })
    }

    // Fetch VDR activities for these contacts
    const [activities, total] = await Promise.all([
      prisma.dataRoomActivity.findMany({
        where: {
          dataRoomId: dataRoom.id,
          userEmail: { in: contactEmails }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          dataRoom: {
            select: {
              id: true,
            }
          }
        }
      }),
      prisma.dataRoomActivity.count({
        where: {
          dataRoomId: dataRoom.id,
          userEmail: { in: contactEmails }
        }
      })
    ])

    // Enrich with document names if available
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        let documentName: string | undefined
        let folderName: string | undefined

        if (activity.documentId) {
          const doc = await prisma.dataRoomDocument.findUnique({
            where: { id: activity.documentId },
            select: { documentName: true }
          })
          documentName = doc?.documentName
        }

        if (activity.folderId) {
          const folder = await prisma.dataRoomFolder.findUnique({
            where: { id: activity.folderId },
            select: { name: true }
          })
          folderName = folder?.name
        }

        return {
          id: activity.id,
          action: activity.action,
          documentId: activity.documentId,
          folderId: activity.folderId,
          userEmail: activity.userEmail,
          metadata: {
            ...(activity.metadata as object || {}),
            documentName,
            folderName,
          },
          createdAt: activity.createdAt.toISOString(),
        }
      })
    )

    return NextResponse.json({
      activities: enrichedActivities,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + activities.length < total
      }
    })
  } catch (error) {
    console.error('Error fetching VDR activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VDR activity' },
      { status: 500 }
    )
  }
}
