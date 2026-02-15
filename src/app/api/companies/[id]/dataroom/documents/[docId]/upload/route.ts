import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity, notifyTeamMembers } from '@/lib/dataroom'
import { createClient } from '@/lib/supabase/server'
import { validateUploadedFile, handleApiError } from '@/lib/security'

/**
 * POST /api/companies/[id]/dataroom/documents/[docId]/upload
 * Upload a file for a document (creates new version if file exists)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { id: companyId, docId } = await params
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 })
    }

    // SECURITY: Validate file type, extension, and magic bytes
    const fileValidation = await validateUploadedFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // Upload to Supabase Storage
    const supabase = await createClient()
    // SECURITY: Use sanitized filename to prevent path traversal
    const safeFileName = fileValidation.sanitizedName || file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileExt = safeFileName.split('.').pop()
    const storagePath = `${companyId}/${docId}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('data-room')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // For private buckets, we store the path and generate signed URLs on demand
    // Don't use getPublicUrl for private buckets

    // If document already has a file, save current version before replacing
    let newVersion = document.version || 1

    if (document.filePath && document.fileName) {
      // Save current file as a version snapshot
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

      newVersion = (document.version || 1) + 1
    }

    // Calculate next update due date
    let nextUpdateDue: Date | null = null
    if (document.updateFrequency !== 'ONE_TIME' && document.updateFrequency !== 'AS_NEEDED') {
      const now = new Date()
      nextUpdateDue = new Date(now)

      switch (document.updateFrequency) {
        case 'MONTHLY':
          nextUpdateDue.setMonth(now.getMonth() + 1)
          break
        case 'QUARTERLY':
          nextUpdateDue.setMonth(now.getMonth() + 3)
          break
        case 'ANNUALLY':
          nextUpdateDue.setFullYear(now.getFullYear() + 1)
          break
      }
    }

    // Update document with file info (store path only, generate signed URLs on demand)
    const updated = await prisma.dataRoomDocument.update({
      where: { id: docId },
      data: {
        fileUrl: null, // Don't store public URL for private buckets
        filePath: uploadData.path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        lastUpdatedAt: new Date(),
        uploadedByUserId: result.auth.user.id,
        version: newVersion,
        nextUpdateDue,
        status: 'CURRENT',
      },
      include: {
        folder: { select: { id: true, name: true, category: true } },
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
          fileName: file.name,
          fileSize: file.size,
          version: newVersion,
        },
      })

      // Notify team members about the upload
      await notifyTeamMembers({
        companyId,
        dataRoomId: document.folder.dataRoomId,
        type: 'DOCUMENT_UPLOADED',
        title: 'New Document Uploaded',
        message: `${result.auth.user.email} uploaded "${file.name}" to ${updated.folder?.name || 'data room'}`,
        actorEmail: result.auth.user.email,
        actorUserId: result.auth.user.id,
        documentId: docId,
        folderId: document.folderId || undefined,
      }).catch((err) => console.error('Error sending notifications:', err instanceof Error ? err.message : String(err)))
    }

    return NextResponse.json({
      document: updated,
      upload: {
        path: uploadData.path,
      },
    })
  } catch (error) {
    return handleApiError(error, 'document upload')
  }
}

/**
 * DELETE /api/companies/[id]/dataroom/documents/[docId]/upload
 * Remove the file from a document (but keep the document record)
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
      include: { folder: { select: { dataRoomId: true } } },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!document.filePath && !document.fileUrl) {
      return NextResponse.json({ error: 'No file to remove' }, { status: 400 })
    }

    // Delete from storage if we have a path
    if (document.filePath) {
      const supabase = await createClient()
      await supabase.storage.from('data-room').remove([document.filePath])
    }

    // Clear file fields
    const updated = await prisma.dataRoomDocument.update({
      where: { id: docId },
      data: {
        fileUrl: null,
        filePath: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        lastUpdatedAt: null,
        uploadedByUserId: null,
        status: 'NEEDS_UPDATE',
      },
    })

    // Log activity
    if (document.folder) {
      await logActivity({
        dataRoomId: document.folder.dataRoomId,
        userId: result.auth.user.id,
        userEmail: result.auth.user.email,
        action: 'DELETED_DOCUMENT',
        documentId: docId,
        metadata: { removedFile: document.fileName },
      })
    }

    return NextResponse.json({ document: updated })
  } catch (error) {
    return handleApiError(error, 'document file removal')
  }
}
