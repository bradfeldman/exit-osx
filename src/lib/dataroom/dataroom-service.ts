import { prisma } from '@/lib/prisma'
import { DataRoomStage, DataRoomCategory, Prisma } from '@prisma/client'
import { DEFAULT_FOLDERS } from './default-folders'

export type NotificationType = 'DOCUMENT_UPLOADED' | 'QUESTION_ASKED' | 'QUESTION_ANSWERED' | 'ACCESS_GRANTED'

/**
 * Get or create a data room for a company
 */
export async function getOrCreateDataRoom(companyId: string) {
  try {
    // Check if data room exists
    let dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      // Create data room
      dataRoom = await prisma.dataRoom.create({
        data: {
          companyId,
          name: 'Data Room',
          stage: 'PREPARATION',
        },
      })

      // Initialize default folders
      await initializeDefaultFolders(dataRoom.id)
    }

    // Fetch folders separately for cleaner query
    const topLevelFolders = await prisma.dataRoomFolder.findMany({
      where: { dataRoomId: dataRoom.id, parentId: null },
      orderBy: { sortOrder: 'asc' },
    })

    // Fetch children for each folder
    const folderIds = topLevelFolders.map((f) => f.id)
    const allChildren = folderIds.length > 0
      ? await prisma.dataRoomFolder.findMany({
          where: { parentId: { in: folderIds } },
          orderBy: { sortOrder: 'asc' },
        })
      : []

    // Group children by parent
    const childrenByParent = new Map<string, typeof allChildren>()
    for (const child of allChildren) {
      if (child.parentId) {
        const existing = childrenByParent.get(child.parentId) || []
        existing.push(child)
        childrenByParent.set(child.parentId, existing)
      }
    }

    // Build final structure
    const foldersWithChildren = topLevelFolders.map((folder) => ({
      ...folder,
      children: childrenByParent.get(folder.id) || [],
    }))

    return {
      ...dataRoom,
      folders: foldersWithChildren,
    }
  } catch (error) {
    console.error('[DataRoom Service] Error in getOrCreateDataRoom:', error)
    throw error
  }
}

/**
 * Initialize default folder structure for a data room
 */
export async function initializeDefaultFolders(dataRoomId: string) {
  const createdFolders: { category: DataRoomCategory; folderId: string }[] = []

  try {
    for (const template of DEFAULT_FOLDERS) {
      // Create parent folder
      const parentFolder = await prisma.dataRoomFolder.create({
        data: {
          dataRoomId,
          name: template.name,
          category: template.category,
          sortOrder: template.sortOrder,
          minStage: template.minStage,
        },
      })

      createdFolders.push({ category: template.category, folderId: parentFolder.id })

      // Create child folders
      for (let i = 0; i < template.children.length; i++) {
        await prisma.dataRoomFolder.create({
          data: {
            dataRoomId,
            parentId: parentFolder.id,
            name: template.children[i],
            category: template.category,
            sortOrder: i + 1,
            minStage: template.minStage,
          },
        })
      }
    }

    return createdFolders
  } catch (error) {
    console.error('[DataRoom Service] Error in initializeDefaultFolders:', error)
    throw error
  }
}

/**
 * Get folder by ID with documents and children
 */
export async function getFolder(folderId: string) {
  return prisma.dataRoomFolder.findUnique({
    where: { id: folderId },
    include: {
      children: {
        orderBy: { sortOrder: 'asc' },
      },
      documents: {
        include: {
          tags: {
            include: { tag: true },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { documentName: 'asc' }],
      },
      parent: true,
    },
  })
}

/**
 * Get documents in a folder with optional stage filter
 */
export async function getFolderDocuments(
  folderId: string,
  options?: {
    maxStage?: DataRoomStage
    includeSubfolders?: boolean
  }
) {
  const folder = await prisma.dataRoomFolder.findUnique({
    where: { id: folderId },
    select: { minStage: true },
  })

  if (!folder) return []

  // Check if user has access to this folder's stage
  if (options?.maxStage) {
    const stageOrder: DataRoomStage[] = ['PREPARATION', 'TEASER', 'POST_NDA', 'DUE_DILIGENCE', 'CLOSED']
    const userStageIndex = stageOrder.indexOf(options.maxStage)
    const folderStageIndex = stageOrder.indexOf(folder.minStage)

    if (userStageIndex < folderStageIndex) {
      return [] // User doesn't have access to this stage
    }
  }

  const where: Prisma.DataRoomDocumentWhereInput = { folderId }

  if (options?.includeSubfolders) {
    // Get all subfolder IDs
    const subfolders = await prisma.dataRoomFolder.findMany({
      where: { parentId: folderId },
      select: { id: true },
    })
    const folderIds = [folderId, ...subfolders.map((f) => f.id)]
    where.folderId = { in: folderIds }
  }

  return prisma.dataRoomDocument.findMany({
    where,
    include: {
      tags: {
        include: { tag: true },
      },
      views: {
        select: {
          userId: true,
          viewCount: true,
          lastViewedAt: true,
        },
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { documentName: 'asc' }],
  })
}

/**
 * Log activity in the data room
 */
export async function logActivity(params: {
  dataRoomId: string
  userId: string
  userEmail: string
  action: Prisma.DataRoomActivityCreateInput['action']
  documentId?: string
  folderId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}) {
  return prisma.dataRoomActivity.create({
    data: {
      dataRoomId: params.dataRoomId,
      userId: params.userId,
      userEmail: params.userEmail,
      action: params.action,
      documentId: params.documentId,
      folderId: params.folderId,
      metadata: params.metadata as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  })
}

/**
 * Track document view
 */
export async function trackDocumentView(params: {
  documentId: string
  userId: string
  userEmail: string
  duration?: number // seconds
}) {
  const existing = await prisma.dataRoomDocumentView.findUnique({
    where: {
      documentId_userId: {
        documentId: params.documentId,
        userId: params.userId,
      },
    },
  })

  if (existing) {
    return prisma.dataRoomDocumentView.update({
      where: { id: existing.id },
      data: {
        viewCount: { increment: 1 },
        totalDuration: params.duration ? { increment: params.duration } : undefined,
        lastViewedAt: new Date(),
      },
    })
  }

  return prisma.dataRoomDocumentView.create({
    data: {
      documentId: params.documentId,
      userId: params.userId,
      userEmail: params.userEmail,
      viewCount: 1,
      totalDuration: params.duration || 0,
    },
  })
}

/**
 * Check if user has access to data room at given stage
 */
export async function checkDataRoomAccess(
  dataRoomId: string,
  userEmail: string
): Promise<{ hasAccess: boolean; maxStage?: DataRoomStage; accessLevel?: string }> {
  const access = await prisma.dataRoomAccess.findUnique({
    where: {
      dataRoomId_email: {
        dataRoomId,
        email: userEmail,
      },
    },
  })

  if (!access) {
    return { hasAccess: false }
  }

  // Check expiration
  if (access.expiresAt && access.expiresAt < new Date()) {
    return { hasAccess: false }
  }

  return {
    hasAccess: true,
    maxStage: access.maxStage,
    accessLevel: access.accessLevel,
  }
}

/**
 * Calculate readiness score for a data room
 */
export async function calculateReadinessScore(dataRoomId: string): Promise<{
  score: number
  byCategory: Record<DataRoomCategory, { uploaded: number; expected: number; percentage: number }>
  missingCritical: string[]
}> {
  try {
    const folders = await prisma.dataRoomFolder.findMany({
      where: { dataRoomId, parentId: null },
      include: {
        documents: {
          where: {
            OR: [
              { fileUrl: { not: null } },
              { filePath: { not: null } },
            ],
          },
          select: { id: true },
        },
        children: {
          include: {
            documents: {
              where: {
                OR: [
                  { fileUrl: { not: null } },
                  { filePath: { not: null } },
                ],
              },
              select: { id: true },
            },
          },
        },
      },
    })

    // Expected documents per category (based on template)
    const expectedCounts: Record<DataRoomCategory, number> = {} as Record<DataRoomCategory, number>
    for (const template of DEFAULT_FOLDERS) {
      expectedCounts[template.category] = Math.max(template.children.length, 1)
    }

    // Calculate by category
    const byCategory: Record<DataRoomCategory, { uploaded: number; expected: number; percentage: number }> = {} as Record<DataRoomCategory, { uploaded: number; expected: number; percentage: number }>
    const missingCritical: string[] = []

    let totalUploaded = 0
    let totalExpected = 0

    for (const folder of folders) {
      const docsInFolder = folder.documents.length
      const docsInChildren = folder.children.reduce((sum, child) => sum + child.documents.length, 0)
      const uploaded = docsInFolder + docsInChildren
      const expected = expectedCounts[folder.category] || 1

      byCategory[folder.category] = {
        uploaded,
        expected,
        percentage: Math.min(100, Math.round((uploaded / expected) * 100)),
      }

      totalUploaded += uploaded
      totalExpected += expected

      // Track missing critical categories
      if (uploaded === 0 && ['FINANCIAL', 'LEGAL', 'CORPORATE'].includes(folder.category)) {
        missingCritical.push(folder.name)
      }
    }

    const score = totalExpected > 0 ? Math.round((totalUploaded / totalExpected) * 100) : 0

    return {
      score: Math.min(100, score),
      byCategory,
      missingCritical,
    }
  } catch (error) {
    console.error('[DataRoom Service] Error in calculateReadinessScore:', error)
    // Return a default score on error
    return {
      score: 0,
      byCategory: {} as Record<DataRoomCategory, { uploaded: number; expected: number; percentage: number }>,
      missingCritical: [],
    }
  }
}

/**
 * Get activity analytics for a data room
 */
export async function getDataRoomAnalytics(dataRoomId: string, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const [activities, documentViews, accessGrants] = await Promise.all([
    prisma.dataRoomActivity.findMany({
      where: {
        dataRoomId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.dataRoomDocumentView.findMany({
      where: {
        document: {
          folder: {
            dataRoomId,
          },
        },
        lastViewedAt: { gte: since },
      },
      include: {
        document: {
          select: { documentName: true, folderId: true },
        },
      },
      orderBy: { viewCount: 'desc' },
      take: 20,
    }),
    prisma.dataRoomAccess.findMany({
      where: { dataRoomId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Calculate engagement by user
  const userEngagement = new Map<string, { views: number; downloads: number; lastActive: Date }>()
  for (const activity of activities) {
    const existing = userEngagement.get(activity.userEmail) || { views: 0, downloads: 0, lastActive: activity.createdAt }
    if (activity.action === 'VIEWED_DOCUMENT') existing.views++
    if (activity.action === 'DOWNLOADED_DOCUMENT') existing.downloads++
    if (activity.createdAt > existing.lastActive) existing.lastActive = activity.createdAt
    userEngagement.set(activity.userEmail, existing)
  }

  return {
    totalViews: activities.filter((a) => a.action === 'VIEWED_DOCUMENT').length,
    totalDownloads: activities.filter((a) => a.action === 'DOWNLOADED_DOCUMENT').length,
    uniqueViewers: userEngagement.size,
    recentActivity: activities.slice(0, 20),
    topDocuments: documentViews,
    accessGrants,
    userEngagement: Array.from(userEngagement.entries()).map(([email, stats]) => ({
      email,
      ...stats,
    })),
  }
}

/**
 * Create a notification for data room activity
 */
export async function createNotification(params: {
  dataRoomId: string
  recipientUserId: string
  type: NotificationType
  title: string
  message: string
  actorEmail: string
  actorUserId?: string
  documentId?: string
  questionId?: string
  folderId?: string
}) {
  return prisma.dataRoomNotification.create({
    data: {
      dataRoomId: params.dataRoomId,
      recipientUserId: params.recipientUserId,
      type: params.type,
      title: params.title,
      message: params.message,
      actorEmail: params.actorEmail,
      actorUserId: params.actorUserId,
      documentId: params.documentId,
      questionId: params.questionId,
      folderId: params.folderId,
    },
  })
}

/**
 * Notify all team members about data room events (except the actor)
 */
export async function notifyTeamMembers(params: {
  companyId: string
  dataRoomId: string
  type: NotificationType
  title: string
  message: string
  actorEmail: string
  actorUserId?: string
  documentId?: string
  questionId?: string
  folderId?: string
}) {
  // Get company and find workspace
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { workspaceId: true },
  })

  if (!company?.workspaceId) return []

  // Get all workspace members except the actor
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: company.workspaceId,
      userId: params.actorUserId ? { not: params.actorUserId } : undefined,
    },
    select: { userId: true },
  })

  // Create notifications for all team members
  const notifications = await Promise.all(
    workspaceMembers.map((workspaceMember) =>
      createNotification({
        dataRoomId: params.dataRoomId,
        recipientUserId: workspaceMember.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        actorEmail: params.actorEmail,
        actorUserId: params.actorUserId,
        documentId: params.documentId,
        questionId: params.questionId,
        folderId: params.folderId,
      })
    )
  )

  return notifications
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number; companyId?: string }
) {
  const where: Prisma.DataRoomNotificationWhereInput = {
    recipientUserId: userId,
  }

  if (options?.unreadOnly) {
    where.isRead = false
  }

  if (options?.companyId) {
    where.dataRoom = {
      companyId: options.companyId,
    }
  }

  return prisma.dataRoomNotification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    include: {
      dataRoom: {
        select: {
          id: true,
          name: true,
          company: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })
}

/**
 * Mark notification(s) as read
 */
export async function markNotificationsRead(
  userId: string,
  notificationIds?: string[]
) {
  const where: Prisma.DataRoomNotificationWhereInput = {
    recipientUserId: userId,
    isRead: false,
  }

  if (notificationIds && notificationIds.length > 0) {
    where.id = { in: notificationIds }
  }

  return prisma.dataRoomNotification.updateMany({
    where,
    data: {
      isRead: true,
      readAt: new Date(),
    },
  })
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(
  userId: string,
  companyId?: string
) {
  const where: Prisma.DataRoomNotificationWhereInput = {
    recipientUserId: userId,
    isRead: false,
  }

  if (companyId) {
    where.dataRoom = {
      companyId,
    }
  }

  return prisma.dataRoomNotification.count({ where })
}
