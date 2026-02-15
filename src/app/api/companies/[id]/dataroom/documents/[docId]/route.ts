import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity, trackDocumentView } from '@/lib/dataroom'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

/**
 * GET /api/companies/[id]/dataroom/documents/[docId]
 * Get a specific document and track view
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: companyId, docId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const document = await prisma.dataRoomDocument.findUnique({
      where: { id: docId },
      include: {
        folder: {
          select: { id: true, name: true, category: true, dataRoomId: true },
        },
        tags: {
          include: { tag: true },
        },
        linkedTask: {
          select: { id: true, title: true, status: true },
        },
        previousVersion: {
          select: { id: true, documentName: true, version: true, lastUpdatedAt: true },
        },
        views: true,
      },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Track view
    await trackDocumentView({
      documentId: docId,
      userId: result.auth.user.id,
      userEmail: result.auth.user.email,
    })

    // Log activity
    if (document.folder) {
      await logActivity({
        dataRoomId: document.folder.dataRoomId,
        userId: result.auth.user.id,
        userEmail: result.auth.user.email,
        action: 'VIEWED_DOCUMENT',
        documentId: docId,
        folderId: document.folderId || undefined,
      })
    }

    // Get uploader info
    let uploadedBy = null
    if (document.uploadedByUserId) {
      uploadedBy = await prisma.user.findUnique({
        where: { id: document.uploadedByUserId },
        select: { id: true, name: true, email: true },
      })
    }

    // Get version history
    const versions = await prisma.dataRoomDocument.findMany({
      where: {
        OR: [{ id: document.previousVersionId || '' }, { previousVersionId: document.id }],
      },
      select: {
        id: true,
        version: true,
        lastUpdatedAt: true,
        uploadedByUserId: true,
      },
      orderBy: { version: 'desc' },
    })

    return NextResponse.json({
      document: {
        ...document,
        uploadedBy,
        versionHistory: versions,
      },
    })
  } catch (error) {
    console.error('Error fetching document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateDocumentSchema = z.object({
  documentName: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  folderId: z.string().uuid().optional(),
  displayOrder: z.coerce.number().int().finite().optional(),
  isConfidential: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
  updateFrequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY', 'AS_NEEDED', 'ONE_TIME']).optional(),
  notes: z.string().max(5000).optional(),
})

/**
 * PUT /api/companies/[id]/dataroom/documents/[docId]
 * Update document metadata
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: companyId, docId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, updateDocumentSchema)
    if (!validation.success) return validation.error

    const documentWithFolder = await prisma.dataRoomDocument.findUnique({
      where: { id: docId },
      include: { folder: { select: { dataRoomId: true } } },
    })

    if (!documentWithFolder || documentWithFolder.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const {
      documentName,
      description,
      folderId,
      displayOrder,
      isConfidential,
      allowDownload,
      updateFrequency,
      notes,
    } = validation.data

    const updateData: Record<string, unknown> = {}

    if (documentName !== undefined) updateData.documentName = documentName
    if (description !== undefined) updateData.description = description
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder
    if (isConfidential !== undefined) updateData.isConfidential = isConfidential
    if (allowDownload !== undefined) updateData.allowDownload = allowDownload
    if (updateFrequency !== undefined) updateData.updateFrequency = updateFrequency
    if (notes !== undefined) updateData.notes = notes

    // Handle folder change
    if (folderId !== undefined && folderId !== documentWithFolder.folderId) {
      const dataRoom = await prisma.dataRoom.findUnique({ where: { companyId } })
      const newFolder = await prisma.dataRoomFolder.findUnique({ where: { id: folderId } })

      if (!newFolder || newFolder.dataRoomId !== dataRoom?.id) {
        return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
      }

      updateData.folderId = folderId
      updateData.category = newFolder.category
    }

    const updated = await prisma.dataRoomDocument.update({
      where: { id: docId },
      data: updateData,
      include: {
        folder: { select: { id: true, name: true, category: true } },
        tags: { include: { tag: true } },
      },
    })

    // Log activity
    if (documentWithFolder.folder) {
      await logActivity({
        dataRoomId: documentWithFolder.folder.dataRoomId,
        userId: result.auth.user.id,
        userEmail: result.auth.user.email,
        action: 'UPDATED_DOCUMENT',
        documentId: docId,
        metadata: { changes: Object.keys(updateData) },
      })
    }

    return NextResponse.json({ document: updated })
  } catch (error) {
    console.error('Error updating document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/dataroom/documents/[docId]
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: companyId, docId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const docToDelete = await prisma.dataRoomDocument.findUnique({
      where: { id: docId },
      include: { folder: { select: { dataRoomId: true } } },
    })

    if (!docToDelete || docToDelete.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Don't allow deleting required documents
    if (docToDelete.isRequired) {
      return NextResponse.json(
        { error: 'Cannot delete required documents. Remove the file instead.' },
        { status: 400 }
      )
    }

    // Delete related records
    await prisma.$transaction([
      prisma.dataRoomDocumentTag.deleteMany({ where: { documentId: docId } }),
      prisma.dataRoomDocumentView.deleteMany({ where: { documentId: docId } }),
      prisma.dataRoomActivity.deleteMany({ where: { documentId: docId } }),
      prisma.dataRoomDocument.delete({ where: { id: docId } }),
    ])

    // Log activity
    if (docToDelete.folder) {
      await logActivity({
        dataRoomId: docToDelete.folder.dataRoomId,
        userId: result.auth.user.id,
        userEmail: result.auth.user.email,
        action: 'DELETED_DOCUMENT',
        metadata: { documentName: docToDelete.documentName },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
