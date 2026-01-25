import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/dataroom'
import { createClient } from '@/lib/supabase/server'
import { SIGNED_URL_PREVIEW_EXPIRY_SECONDS } from '@/lib/security'

/**
 * GET /api/companies/[id]/dataroom/documents/[docId]/preview
 * Generate a signed URL for previewing a document (no watermark)
 * Logs view activity
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
      include: { folder: { select: { dataRoomId: true } } },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!document.filePath) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 404 })
    }

    // SECURITY: Generate signed URL with reduced expiry (10 minutes instead of 1 hour)
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('data-room')
      .createSignedUrl(document.filePath, SIGNED_URL_PREVIEW_EXPIRY_SECONDS)

    if (error) {
      console.error('Error creating signed URL:', error)
      return NextResponse.json({ error: 'Failed to generate preview URL' }, { status: 500 })
    }

    // Log the view activity
    if (document.folder) {
      await logActivity({
        dataRoomId: document.folder.dataRoomId,
        userId: result.auth.user.id,
        userEmail: result.auth.user.email,
        action: 'VIEWED_DOCUMENT',
        documentId: docId,
        folderId: document.folderId || undefined,
        metadata: {
          fileName: document.fileName,
        },
      })
    }

    return NextResponse.json({
      url: data.signedUrl,
      fileName: document.fileName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      expiresIn: SIGNED_URL_PREVIEW_EXPIRY_SECONDS,
    })
  } catch (error) {
    console.error('Error generating preview URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
