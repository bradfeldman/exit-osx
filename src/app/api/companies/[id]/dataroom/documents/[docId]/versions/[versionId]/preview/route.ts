import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { SIGNED_URL_PREVIEW_EXPIRY_SECONDS } from '@/lib/security'

/**
 * GET /api/companies/[id]/dataroom/documents/[docId]/versions/[versionId]/preview
 * Generate a signed URL for previewing a specific version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string; versionId: string }> }
) {
  const { id: companyId, docId, versionId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const document = await prisma.dataRoomDocument.findUnique({
      where: { id: docId },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Find the version
    const version = await prisma.dataRoomDocumentVersion.findUnique({
      where: { id: versionId },
    })

    if (!version || version.documentId !== docId) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // SECURITY: Generate signed URL with reduced expiry
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('data-room')
      .createSignedUrl(version.filePath, SIGNED_URL_PREVIEW_EXPIRY_SECONDS)

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 })
    }

    return NextResponse.json({
      url: data.signedUrl,
      fileName: version.fileName,
      mimeType: version.mimeType,
      fileSize: version.fileSize,
      version: version.version,
      expiresIn: SIGNED_URL_PREVIEW_EXPIRY_SECONDS,
    })
  } catch (error) {
    console.error('Error generating version preview URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
