import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/companies/[id]/evidence/documents/[docId]
 * Remove a document from the evidence room.
 * Deletes the file from Supabase storage and the DB record.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: companyId, docId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const document = await prisma.dataRoomDocument.findUnique({
      where: { id: docId },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete file from Supabase storage
    if (document.filePath) {
      const supabase = await createClient()
      const { error: storageError } = await supabase.storage
        .from('data-room')
        .remove([document.filePath])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continue with DB deletion even if storage fails
      }
    }

    // Delete DB record (cascades to versions, tags, views)
    await prisma.dataRoomDocument.delete({
      where: { id: docId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting evidence document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
