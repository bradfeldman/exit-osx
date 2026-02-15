import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { UpdateFrequency } from '@prisma/client'
import { logActivity } from '@/lib/dataroom'

const VALID_FREQUENCIES = new Set<string>(Object.values(UpdateFrequency))

/**
 * GET /api/companies/[id]/dataroom/documents
 * Get documents, optionally filtered by folder
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
    const folderId = searchParams.get('folderId')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const hasFile = searchParams.get('hasFile')
    const search = searchParams.get('search')
    const tagIds = searchParams.get('tags') // comma-separated tag IDs
    const updatedAfter = searchParams.get('updatedAfter') // ISO date string
    const updatedBefore = searchParams.get('updatedBefore') // ISO date string

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      folder: { dataRoomId: dataRoom.id },
    }

    if (folderId) {
      where.folderId = folderId
    }

    if (category) {
      where.category = category
    }

    if (status) {
      where.status = status
    }

    if (hasFile === 'true') {
      where.OR = [{ fileUrl: { not: null } }, { filePath: { not: null } }]
    } else if (hasFile === 'false') {
      where.fileUrl = null
      where.filePath = null
    }

    // Search by document name or description
    if (search) {
      where.OR = [
        { documentName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filter by tags
    if (tagIds) {
      const tagIdArray = tagIds.split(',').filter(Boolean)
      if (tagIdArray.length > 0) {
        where.tags = {
          some: {
            tagId: { in: tagIdArray },
          },
        }
      }
    }

    // Date range filter
    if (updatedAfter || updatedBefore) {
      where.lastUpdatedAt = {}
      if (updatedAfter) {
        where.lastUpdatedAt.gte = new Date(updatedAfter)
      }
      if (updatedBefore) {
        where.lastUpdatedAt.lte = new Date(updatedBefore)
      }
    }

    const documents = await prisma.dataRoomDocument.findMany({
      where,
      include: {
        folder: {
          select: { id: true, name: true, category: true },
        },
        tags: {
          include: { tag: true },
        },
        linkedTask: {
          select: { id: true, title: true, status: true },
        },
        views: {
          select: {
            userId: true,
            viewCount: true,
            lastViewedAt: true,
          },
        },
      },
      orderBy: [{ folder: { sortOrder: 'asc' } }, { displayOrder: 'asc' }, { documentName: 'asc' }],
    })

    // Get uploader info
    const uploaderIds = [...new Set(documents.filter((d) => d.uploadedByUserId).map((d) => d.uploadedByUserId))] as string[]
    const uploaders =
      uploaderIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: uploaderIds } },
            select: { id: true, name: true, email: true },
          })
        : []
    const uploaderMap = new Map(uploaders.map((u) => [u.id, u]))

    const documentsWithUploaders = documents.map((doc) => ({
      ...doc,
      uploadedBy: doc.uploadedByUserId ? uploaderMap.get(doc.uploadedByUserId) || null : null,
    }))

    return NextResponse.json({ documents: documentsWithUploaders })
  } catch (error) {
    console.error('Error fetching documents:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/companies/[id]/dataroom/documents
 * Create a new document placeholder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const {
      folderId,
      documentName,
      description,
      updateFrequency = 'AS_NEEDED',
      isRequired = false,
      isConfidential = false,
    } = body

    if (!folderId || !documentName) {
      return NextResponse.json({ error: 'Folder ID and document name are required' }, { status: 400 })
    }

    if (!VALID_FREQUENCIES.has(updateFrequency)) {
      return NextResponse.json({ error: `Invalid update frequency: ${updateFrequency}` }, { status: 400 })
    }

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    // Verify folder belongs to data room
    const folder = await prisma.dataRoomFolder.findUnique({
      where: { id: folderId },
    })

    if (!folder || folder.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Get max display order
    const maxOrder = await prisma.dataRoomDocument.aggregate({
      where: { folderId },
      _max: { displayOrder: true },
    })

    const document = await prisma.dataRoomDocument.create({
      data: {
        companyId,
        folderId,
        documentName,
        description,
        category: folder.category,
        updateFrequency,
        isRequired,
        isCustom: true,
        isConfidential,
        displayOrder: (maxOrder._max.displayOrder || 0) + 1,
      },
      include: {
        folder: { select: { id: true, name: true } },
      },
    })

    // Log activity
    await logActivity({
      dataRoomId: dataRoom.id,
      userId: result.auth.user.id,
      userEmail: result.auth.user.email,
      action: 'UPLOADED_DOCUMENT',
      documentId: document.id,
      folderId,
      metadata: { documentName },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
