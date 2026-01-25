import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/companies/[id]/dataroom/documents/[docId]/versions
 * List all versions of a document
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
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get all historical versions
    const versions = await prisma.dataRoomDocumentVersion.findMany({
      where: { documentId: docId },
      orderBy: { version: 'desc' },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    })

    // Build version list including current version
    const allVersions = []

    // Add current version if file exists
    if (document.filePath) {
      allVersions.push({
        id: 'current',
        version: document.version,
        filePath: document.filePath,
        fileName: document.fileName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        uploadedBy: document.uploadedBy,
        uploadedAt: document.lastUpdatedAt,
        isCurrent: true,
      })
    }

    // Add historical versions
    for (const v of versions) {
      allVersions.push({
        id: v.id,
        version: v.version,
        filePath: v.filePath,
        fileName: v.fileName,
        fileSize: v.fileSize,
        mimeType: v.mimeType,
        uploadedBy: v.uploadedBy,
        uploadedAt: v.uploadedAt,
        archivedAt: v.archivedAt,
        isCurrent: false,
      })
    }

    return NextResponse.json({
      documentId: docId,
      documentName: document.documentName,
      currentVersion: document.version,
      versions: allVersions,
    })
  } catch (error) {
    console.error('Error fetching versions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
