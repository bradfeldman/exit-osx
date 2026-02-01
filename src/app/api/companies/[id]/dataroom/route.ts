import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { getOrCreateDataRoom, calculateReadinessScore } from '@/lib/dataroom'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/companies/[id]/dataroom
 * Get or create a data room for a company with folder structure
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const dataRoom = await getOrCreateDataRoom(companyId)

    if (!dataRoom) {
      return NextResponse.json({ error: 'Failed to create data room' }, { status: 500 })
    }

    // Calculate readiness score
    const readiness = await calculateReadinessScore(dataRoom.id)

    // Get document counts per folder
    // First get all folder IDs for this data room
    const folderIds = dataRoom.folders?.flatMap((f) => [f.id, ...f.children.map((c) => c.id)]) || []

    let docCountMap = new Map<string | null, number>()

    if (folderIds.length > 0) {
      const folderDocCounts = await prisma.dataRoomDocument.groupBy({
        by: ['folderId'],
        where: {
          folderId: { in: folderIds },
          OR: [
            { fileUrl: { not: null } },
            { filePath: { not: null } },
          ],
        },
        _count: true,
      })

      docCountMap = new Map(
        folderDocCounts.map((fc) => [fc.folderId, fc._count])
      )
    }

    // Enrich folders with document counts
    const foldersWithCounts = (dataRoom.folders || []).map((folder) => ({
      ...folder,
      documentCount: docCountMap.get(folder.id) || 0,
      children: folder.children.map((child) => ({
        ...child,
        documentCount: docCountMap.get(child.id) || 0,
      })),
    }))

    return NextResponse.json({
      dataRoom: {
        ...dataRoom,
        folders: foldersWithCounts,
      },
      readiness,
    })
  } catch (error) {
    console.error('[DataRoom API] Error fetching data room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/companies/[id]/dataroom
 * Update data room settings (name, stage)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { name, stage, settings } = body

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (stage !== undefined) updateData.stage = stage
    if (settings !== undefined) updateData.settings = settings

    const updated = await prisma.dataRoom.update({
      where: { id: dataRoom.id },
      data: updateData,
    })

    return NextResponse.json({ dataRoom: updated })
  } catch (error) {
    console.error('Error updating data room:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
