import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DataRoomCategory, DataRoomStage } from '@prisma/client'

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
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const body = await request.json()
    const { name, parentId, category, minStage } = body

    if (!name) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

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
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
