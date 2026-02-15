import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DataRoomCategory, DataRoomStage } from '@prisma/client'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

/**
 * GET /api/companies/[id]/dataroom/folders
 * Get all folders for a data room
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const folders = await prisma.dataRoomFolder.findMany({
      where: { dataRoomId: dataRoom.id },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        documents: {
          select: { id: true },
        },
        parent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // Organize into tree structure
    const topLevel = folders.filter((f) => !f.parentId)
    const folderTree = topLevel.map((folder) => ({
      ...folder,
      documentCount: folder.documents.length,
      children: folder.children.map((child) => ({
        ...child,
        documentCount: folders.find((f) => f.id === child.id)?.documents.length || 0,
      })),
    }))

    return NextResponse.json({ folders: folderTree })
  } catch (error) {
    console.error('Error fetching folders:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createFolderSchema = z.object({
  name: z.string().min(1).max(500),
  parentId: z.string().uuid().optional().nullable(),
  category: z.enum(['FINANCIAL', 'LEGAL', 'OPERATIONS', 'CUSTOMERS', 'EMPLOYEES', 'IP', 'CUSTOM']).optional(),
  minStage: z.enum(['PREPARATION', 'TEASER', 'POST_NDA', 'DUE_DILIGENCE', 'CLOSED']).optional(),
})

/**
 * POST /api/companies/[id]/dataroom/folders
 * Create a new folder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, createFolderSchema)
    if (!validation.success) return validation.error
    const { name, parentId, category, minStage } = validation.data

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    // Get parent folder if specified
    let parentFolder = null
    if (parentId) {
      parentFolder = await prisma.dataRoomFolder.findUnique({
        where: { id: parentId },
      })
      if (!parentFolder || parentFolder.dataRoomId !== dataRoom.id) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 404 })
      }
    }

    // Get max sort order for siblings
    const maxOrder = await prisma.dataRoomFolder.aggregate({
      where: {
        dataRoomId: dataRoom.id,
        parentId: parentId || null,
      },
      _max: { sortOrder: true },
    })

    const folder = await prisma.dataRoomFolder.create({
      data: {
        dataRoomId: dataRoom.id,
        name,
        parentId: parentId || null,
        category: (category as DataRoomCategory) || parentFolder?.category || 'CUSTOM',
        minStage: (minStage as DataRoomStage) || parentFolder?.minStage || 'PREPARATION',
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
      include: {
        children: true,
        parent: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ folder }, { status: 201 })
  } catch (error) {
    console.error('Error creating folder:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
