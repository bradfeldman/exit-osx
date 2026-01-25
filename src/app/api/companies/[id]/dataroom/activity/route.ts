import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DataRoomAction } from '@prisma/client'

/**
 * GET /api/companies/[id]/dataroom/activity
 * Get activity log for the data room
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
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const action = searchParams.get('action') as DataRoomAction | null
    const userId = searchParams.get('userId')
    const documentId = searchParams.get('documentId')
    const days = parseInt(searchParams.get('days') || '30', 10)

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    // Build where clause
    const since = new Date()
    since.setDate(since.getDate() - days)

    const where: Record<string, unknown> = {
      dataRoomId: dataRoom.id,
      createdAt: { gte: since },
    }

    if (action) where.action = action
    if (userId) where.userId = userId
    if (documentId) where.documentId = documentId

    const [activities, total] = await Promise.all([
      prisma.dataRoomActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.dataRoomActivity.count({ where }),
    ])

    // Get document and folder info separately
    const docIds = [...new Set(activities.filter((a) => a.documentId).map((a) => a.documentId))] as string[]
    const folderIds = [...new Set(activities.filter((a) => a.folderId).map((a) => a.folderId))] as string[]

    const [documents, folders] = await Promise.all([
      docIds.length > 0
        ? prisma.dataRoomDocument.findMany({
            where: { id: { in: docIds } },
            select: { id: true, documentName: true },
          })
        : [],
      folderIds.length > 0
        ? prisma.dataRoomFolder.findMany({
            where: { id: { in: folderIds } },
            select: { id: true, name: true },
          })
        : [],
    ])

    const docMap = new Map(documents.map((d) => [d.id, d]))
    const folderMap = new Map(folders.map((f) => [f.id, f]))

    const activitiesWithRefs = activities.map((activity) => ({
      ...activity,
      document: activity.documentId ? docMap.get(activity.documentId) : null,
      folder: activity.folderId ? folderMap.get(activity.folderId) : null,
    }))

    // Get user info for internal users
    const userIds = [...new Set(activities.map((a) => a.userId))]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const activitiesWithUsers = activitiesWithRefs.map((activity) => ({
      ...activity,
      user: userMap.get(activity.userId) || { id: activity.userId, email: activity.userEmail, name: null, avatarUrl: null },
    }))

    return NextResponse.json({
      activities: activitiesWithUsers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
