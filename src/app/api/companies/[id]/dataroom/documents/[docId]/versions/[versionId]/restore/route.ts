import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/dataroom'

/**
 * POST /api/companies/[id]/dataroom/documents/[docId]/versions/[versionId]/restore
 * Restore a previous version of a document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string; versionId: string }> }
) {
  const { id: companyId, docId, versionId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const document = await prisma.dataRoomDocument.findUnique({
      where: { id: docId },
      include: { folder: { select: { dataRoomId: true } } },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Find the version to restore
    const versionToRestore = await prisma.dataRoomDocumentVersion.findUnique({
      where: { id: versionId },
    })

    if (!versionToRestore || versionToRestore.documentId !== docId) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Save current version before restoring (if there's a current file)
    if (document.filePath && document.fileName) {
      await prisma.dataRoomDocumentVersion.create({
        data: {
          documentId: document.id,
          version: document.version || 1,
          filePath: document.filePath,
          fileName: document.fileName,
          fileSize: document.fileSize || 0,
          mimeType: document.mimeType,
          uploadedByUserId: document.uploadedByUserId,
          uploadedAt: document.lastUpdatedAt || document.createdAt,
        },
      })
    }

    // Restore the selected version
    const newVersion = (document.version || 1) + 1
    const updated = await prisma.dataRoomDocument.update({
      where: { id: docId },
      data: {
        filePath: versionToRestore.filePath,
        fileName: versionToRestore.fileName,
        fileSize: versionToRestore.fileSize,
        mimeType: versionToRestore.mimeType,
        version: newVersion,
        lastUpdatedAt: new Date(),
        uploadedByUserId: result.auth.user.id,
        status: 'CURRENT',
      },
      include: {
        folder: { select: { id: true, name: true, category: true } },
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    })

    // Log activity
    if (document.folder) {
      await logActivity({
        dataRoomId: document.folder.dataRoomId,
        userId: result.auth.user.id,
        userEmail: result.auth.user.email,
        action: 'UPLOADED_DOCUMENT',
        documentId: docId,
        folderId: document.folderId || undefined,
        metadata: {
          fileName: versionToRestore.fileName,
          restoredFromVersion: versionToRestore.version,
          newVersion,
        },
      })
    }

    return NextResponse.json({
      document: updated,
      restoredFromVersion: versionToRestore.version,
    })
  } catch (error) {
    console.error('Error restoring version:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
