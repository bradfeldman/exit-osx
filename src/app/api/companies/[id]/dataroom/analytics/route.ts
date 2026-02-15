import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/companies/[id]/dataroom/analytics
 * Get analytics for the data room
 *
 * Query params:
 * - type: 'engagement' (default) | 'document' | 'user'
 * - documentId: required for type=document
 * - userId: required for type=user
 * - days: number of days to look back (default 30)
 * - limit: number of results (default 10)
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
    const type = searchParams.get('type') || 'engagement'
    const documentId = searchParams.get('documentId')
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '30', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const since = new Date()
    since.setDate(since.getDate() - days)

    // =====================
    // ENGAGEMENT ANALYTICS
    // =====================
    if (type === 'engagement') {
      const [
        totalViews,
        totalDownloads,
        uniqueViewersList,
        viewsByDocument,
        downloadsByDocument,
        dailyActivity,
        userEngagement,
      ] = await Promise.all([
        // Total views
        prisma.dataRoomActivity.count({
          where: {
            dataRoomId: dataRoom.id,
            action: 'VIEWED_DOCUMENT',
            createdAt: { gte: since },
          },
        }),
        // Total downloads
        prisma.dataRoomActivity.count({
          where: {
            dataRoomId: dataRoom.id,
            action: 'DOWNLOADED_DOCUMENT',
            createdAt: { gte: since },
          },
        }),
        // Unique viewers
        prisma.dataRoomActivity.findMany({
          where: {
            dataRoomId: dataRoom.id,
            action: { in: ['VIEWED_DOCUMENT', 'DOWNLOADED_DOCUMENT'] },
            createdAt: { gte: since },
          },
          distinct: ['userId'],
          select: { userId: true, userEmail: true },
        }),
        // Views by document
        prisma.dataRoomActivity.groupBy({
          by: ['documentId'],
          where: {
            dataRoomId: dataRoom.id,
            action: 'VIEWED_DOCUMENT',
            documentId: { not: null },
            createdAt: { gte: since },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: limit,
        }),
        // Downloads by document
        prisma.dataRoomActivity.groupBy({
          by: ['documentId'],
          where: {
            dataRoomId: dataRoom.id,
            action: 'DOWNLOADED_DOCUMENT',
            documentId: { not: null },
            createdAt: { gte: since },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: limit,
        }),
        // Daily activity
        prisma.dataRoomActivity.findMany({
          where: {
            dataRoomId: dataRoom.id,
            action: { in: ['VIEWED_DOCUMENT', 'DOWNLOADED_DOCUMENT'] },
            createdAt: { gte: since },
          },
          select: {
            action: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
        // User engagement
        prisma.dataRoomActivity.groupBy({
          by: ['userId', 'userEmail'],
          where: {
            dataRoomId: dataRoom.id,
            action: { in: ['VIEWED_DOCUMENT', 'DOWNLOADED_DOCUMENT'] },
            createdAt: { gte: since },
          },
          _count: { id: true },
        }),
      ])

      // Get document details
      const docIds = [
        ...new Set([
          ...viewsByDocument.map((v) => v.documentId),
          ...downloadsByDocument.map((d) => d.documentId),
        ]),
      ].filter(Boolean) as string[]

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

      // Group daily activity by date
      const activityByDate: Record<string, { views: number; downloads: number }> = {}
      dailyActivity.forEach((a) => {
        const date = a.createdAt.toISOString().split('T')[0]
        if (!activityByDate[date]) {
          activityByDate[date] = { views: 0, downloads: 0 }
        }
        if (a.action === 'VIEWED_DOCUMENT') {
          activityByDate[date].views++
        } else {
          activityByDate[date].downloads++
        }
      })

      // Get user details
      const userIds = userEngagement.map((u) => u.userId).filter(Boolean) as string[]
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
      const userMap = new Map(users.map((u) => [u.id, u]))

      // Aggregate user stats
      const userStats: Record<string, { views: number; downloads: number; name?: string; email: string }> = {}
      for (const activity of userEngagement) {
        const key = activity.userId || activity.userEmail
        if (!userStats[key]) {
          const user = activity.userId ? userMap.get(activity.userId) : null
          userStats[key] = {
            views: 0,
            downloads: 0,
            name: user?.name || undefined,
            email: user?.email || activity.userEmail,
          }
        }
      }

      // Get per-user view/download counts separately
      const userViewCounts = await prisma.dataRoomActivity.groupBy({
        by: ['userId', 'userEmail'],
        where: {
          dataRoomId: dataRoom.id,
          action: 'VIEWED_DOCUMENT',
          createdAt: { gte: since },
        },
        _count: { id: true },
      })

      const userDownloadCounts = await prisma.dataRoomActivity.groupBy({
        by: ['userId', 'userEmail'],
        where: {
          dataRoomId: dataRoom.id,
          action: 'DOWNLOADED_DOCUMENT',
          createdAt: { gte: since },
        },
        _count: { id: true },
      })

      userViewCounts.forEach((u) => {
        const key = u.userId || u.userEmail
        if (!userStats[key]) {
          const user = u.userId ? userMap.get(u.userId) : null
          userStats[key] = { views: 0, downloads: 0, name: user?.name ?? undefined, email: user?.email || u.userEmail }
        }
        userStats[key].views = u._count.id
      })

      userDownloadCounts.forEach((u) => {
        const key = u.userId || u.userEmail
        if (userStats[key]) {
          userStats[key].downloads = u._count.id
        }
      })

      return NextResponse.json({
        summary: {
          totalViews,
          totalDownloads,
          uniqueViewers: uniqueViewersList.length,
          periodDays: days,
        },
        mostViewed: viewsByDocument.map((v) => ({
          document: docMap.get(v.documentId!),
          viewCount: v._count.id,
        })),
        mostDownloaded: downloadsByDocument.map((d) => ({
          document: docMap.get(d.documentId!),
          downloadCount: d._count.id,
        })),
        activityOverTime: Object.entries(activityByDate)
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        userEngagement: Object.values(userStats)
          .sort((a, b) => (b.views + b.downloads) - (a.views + a.downloads))
          .slice(0, limit),
      })
    }

    // =====================
    // DOCUMENT ANALYTICS
    // =====================
    if (type === 'document' && documentId) {
      const document = await prisma.dataRoomDocument.findUnique({
        where: { id: documentId },
        include: { folder: { select: { name: true, category: true, dataRoomId: true } } },
      })

      if (!document || document.folder?.dataRoomId !== dataRoom.id) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }

      const [viewCount, downloadCount, uniqueViewers, recentActivity, activityByDate] = await Promise.all([
        prisma.dataRoomActivity.count({
          where: {
            dataRoomId: dataRoom.id,
            documentId,
            action: 'VIEWED_DOCUMENT',
            createdAt: { gte: since },
          },
        }),
        prisma.dataRoomActivity.count({
          where: {
            dataRoomId: dataRoom.id,
            documentId,
            action: 'DOWNLOADED_DOCUMENT',
            createdAt: { gte: since },
          },
        }),
        prisma.dataRoomActivity.findMany({
          where: {
            dataRoomId: dataRoom.id,
            documentId,
            action: { in: ['VIEWED_DOCUMENT', 'DOWNLOADED_DOCUMENT'] },
            createdAt: { gte: since },
          },
          distinct: ['userId'],
          select: { userId: true, userEmail: true },
        }),
        prisma.dataRoomActivity.findMany({
          where: {
            dataRoomId: dataRoom.id,
            documentId,
            action: { in: ['VIEWED_DOCUMENT', 'DOWNLOADED_DOCUMENT'] },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            action: true,
            userId: true,
            userEmail: true,
            createdAt: true,
          },
        }),
        prisma.dataRoomActivity.findMany({
          where: {
            dataRoomId: dataRoom.id,
            documentId,
            action: { in: ['VIEWED_DOCUMENT', 'DOWNLOADED_DOCUMENT'] },
            createdAt: { gte: since },
          },
          select: { action: true, createdAt: true },
        }),
      ])

      // Get user details
      const userIds = recentActivity.map((a) => a.userId).filter(Boolean) as string[]
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
      const userMap = new Map(users.map((u) => [u.id, u]))

      // Group by date
      const dailyStats: Record<string, { views: number; downloads: number }> = {}
      activityByDate.forEach((a) => {
        const date = a.createdAt.toISOString().split('T')[0]
        if (!dailyStats[date]) dailyStats[date] = { views: 0, downloads: 0 }
        if (a.action === 'VIEWED_DOCUMENT') dailyStats[date].views++
        else dailyStats[date].downloads++
      })

      return NextResponse.json({
        document: {
          id: document.id,
          name: document.documentName,
          fileName: document.fileName,
          folder: document.folder?.name,
          category: document.folder?.category,
        },
        summary: {
          viewCount,
          downloadCount,
          uniqueViewers: uniqueViewers.length,
          periodDays: days,
        },
        activityOverTime: Object.entries(dailyStats)
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          action: a.action,
          user: a.userId ? userMap.get(a.userId) || { email: a.userEmail } : { email: a.userEmail },
          timestamp: a.createdAt,
        })),
      })
    }

    // =====================
    // USER ACCESS REPORT
    // =====================
    if (type === 'user' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const [activities, viewCount, downloadCount] = await Promise.all([
        prisma.dataRoomActivity.findMany({
          where: {
            dataRoomId: dataRoom.id,
            userId,
            action: { in: ['VIEWED_DOCUMENT', 'DOWNLOADED_DOCUMENT'] },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            documentId: true,
            createdAt: true,
          },
        }),
        prisma.dataRoomActivity.count({
          where: {
            dataRoomId: dataRoom.id,
            userId,
            action: 'VIEWED_DOCUMENT',
            createdAt: { gte: since },
          },
        }),
        prisma.dataRoomActivity.count({
          where: {
            dataRoomId: dataRoom.id,
            userId,
            action: 'DOWNLOADED_DOCUMENT',
            createdAt: { gte: since },
          },
        }),
      ])

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

      // Aggregate by document
      const documentAccess: Record<string, {
        views: number
        downloads: number
        firstAccess: Date
        lastAccess: Date
      }> = {}

      activities.forEach((a) => {
        if (!a.documentId) return
        if (!documentAccess[a.documentId]) {
          documentAccess[a.documentId] = {
            views: 0,
            downloads: 0,
            firstAccess: a.createdAt,
            lastAccess: a.createdAt,
          }
        }
        if (a.action === 'VIEWED_DOCUMENT') documentAccess[a.documentId].views++
        else documentAccess[a.documentId].downloads++

        if (a.createdAt < documentAccess[a.documentId].firstAccess) {
          documentAccess[a.documentId].firstAccess = a.createdAt
        }
        if (a.createdAt > documentAccess[a.documentId].lastAccess) {
          documentAccess[a.documentId].lastAccess = a.createdAt
        }
      })

      // Activity by date
      const activityByDate: Record<string, { views: number; downloads: number }> = {}
      activities
        .filter((a) => a.createdAt >= since)
        .forEach((a) => {
          const date = a.createdAt.toISOString().split('T')[0]
          if (!activityByDate[date]) activityByDate[date] = { views: 0, downloads: 0 }
          if (a.action === 'VIEWED_DOCUMENT') activityByDate[date].views++
          else activityByDate[date].downloads++
        })

      return NextResponse.json({
        user,
        summary: {
          totalViews: viewCount,
          totalDownloads: downloadCount,
          uniqueDocuments: docIds.length,
          totalActivities: activities.length,
          periodDays: days,
        },
        documentAccess: Object.entries(documentAccess)
          .map(([docId, access]) => ({
            document: docMap.get(docId),
            ...access,
          }))
          .sort((a, b) => b.lastAccess.getTime() - a.lastAccess.getTime()),
        activityOverTime: Object.entries(activityByDate)
          .map(([date, counts]) => ({ date, ...counts }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        recentActivity: activities.slice(0, 50).map((a) => ({
          id: a.id,
          action: a.action,
          document: a.documentId ? docMap.get(a.documentId) : null,
          timestamp: a.createdAt,
        })),
      })
    }

    return NextResponse.json({ error: 'Invalid type or missing required parameters' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching analytics:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
