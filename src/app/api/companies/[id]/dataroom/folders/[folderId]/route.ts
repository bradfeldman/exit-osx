import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getFolder } from '@/lib/dataroom'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/companies/[id]/dataroom/folders/[folderId]
 * Get a specific folder with documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const { id: companyId, folderId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const folder = await getFolder(folderId)

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Verify folder belongs to company's data room
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom || folder.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    return NextResponse.json({ folder })
  } catch (error) {
    console.error('Error fetching folder:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/companies/[id]/dataroom/folders/[folderId]
 * Update a folder
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const { id: companyId, folderId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { name, minStage, sortOrder } = body

    // Verify folder belongs to company
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const folder = await prisma.dataRoomFolder.findUnique({
      where: { id: folderId },
    })

    if (!folder || folder.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (minStage !== undefined) updateData.minStage = minStage
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const updated = await prisma.dataRoomFolder.update({
      where: { id: folderId },
      data: updateData,
      include: {
        children: { orderBy: { sortOrder: 'asc' } },
        parent: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ folder: updated })
  } catch (error) {
    console.error('Error updating folder:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/dataroom/folders/[folderId]
 * Delete a folder (only if empty or force=true)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  const { id: companyId, folderId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    // Verify folder belongs to company
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const folder = await prisma.dataRoomFolder.findUnique({
      where: { id: folderId },
      include: {
        children: true,
        documents: { select: { id: true } },
      },
    })

    if (!folder || folder.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Check if folder has contents
    const hasContents = folder.children.length > 0 || folder.documents.length > 0

    if (hasContents && !force) {
      return NextResponse.json(
        {
          error: 'Folder not empty',
          message: 'Folder contains documents or subfolders. Use force=true to delete.',
          childCount: folder.children.length,
          documentCount: folder.documents.length,
        },
        { status: 400 }
      )
    }

    if (force && hasContents) {
      // Move documents to parent or CUSTOM folder
      const customFolder = await prisma.dataRoomFolder.findFirst({
        where: { dataRoomId: dataRoom.id, category: 'CUSTOM', parentId: null },
      })

      const targetFolderId = folder.parentId || customFolder?.id

      if (targetFolderId) {
        await prisma.dataRoomDocument.updateMany({
          where: { folderId: { in: [folderId, ...folder.children.map((c) => c.id)] } },
          data: { folderId: targetFolderId },
        })
      }

      // Delete child folders
      await prisma.dataRoomFolder.deleteMany({
        where: { parentId: folderId },
      })
    }

    await prisma.dataRoomFolder.delete({
      where: { id: folderId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
