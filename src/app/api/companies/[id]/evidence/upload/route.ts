import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { validateUploadedFile, handleApiError, EVIDENCE_ALLOWED_MIME_TYPES, EVIDENCE_MAX_FILE_SIZE } from '@/lib/security'
import { createDocumentUploadSignal } from '@/lib/signals/create-document-signal'
import type { EvidenceCategory } from '@/lib/evidence/evidence-categories'
import type { DataRoomCategory } from '@prisma/client'

const EVIDENCE_TO_DATAROOM_CATEGORY: Record<EvidenceCategory, DataRoomCategory> = {
  financial: 'FINANCIAL',
  legal: 'LEGAL',
  operational: 'OPERATIONS',
  customers: 'CUSTOMERS',
  team: 'EMPLOYEES',
  ipTech: 'IP',
}

/**
 * POST /api/companies/[id]/evidence/upload
 * Upload a document for the evidence scorecard.
 * Creates or reuses a DataRoomDocument with evidence metadata.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentName = formData.get('documentName') as string | null
    const evidenceCategory = formData.get('evidenceCategory') as EvidenceCategory | null
    const expectedDocumentId = formData.get('expectedDocumentId') as string | null
    const documentId = formData.get('documentId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!documentName || !evidenceCategory) {
      return NextResponse.json({ error: 'Document name and evidence category are required' }, { status: 400 })
    }

    if (!(evidenceCategory in EVIDENCE_TO_DATAROOM_CATEGORY)) {
      return NextResponse.json({ error: `Invalid evidence category: ${evidenceCategory}` }, { status: 400 })
    }

    if (file.size > EVIDENCE_MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })
    }

    if (!EVIDENCE_ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'File type not accepted. Upload PDF, Word, TXT, PNG, JPEG, or Excel files only.' },
        { status: 400 }
      )
    }

    const fileValidation = await validateUploadedFile(file)
    if (!fileValidation.valid) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // Auto-rename: standardized naming convention for evidence documents
    // Format: {Category}_{Document-Name}_{YYYYMMDD}.{ext}
    const supabase = await createClient()
    const safeFileName = fileValidation.sanitizedName || file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileExt = safeFileName.split('.').pop()
    const safeName = documentName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    const categoryPrefix = evidenceCategory.charAt(0).toUpperCase() + evidenceCategory.slice(1)
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const displayFileName = `${categoryPrefix}_${safeName}_${dateStr}.${fileExt}`
    const storagePath = `${companyId}/evidence/${displayFileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('data-room')
      .upload(storagePath, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // If documentId is provided, update existing placeholder record with the file
    if (documentId) {
      const existing = await prisma.dataRoomDocument.findUnique({ where: { id: documentId } })
      if (existing && existing.companyId === companyId) {
        const updated = await prisma.dataRoomDocument.update({
          where: { id: documentId },
          data: {
            filePath: uploadData.path,
            fileName: displayFileName,
            fileSize: file.size,
            mimeType: file.type,
            lastUpdatedAt: new Date(),
            status: 'CURRENT',
          },
        })
        return NextResponse.json({ document: updated }, { status: 200 })
      }
    }

    // Find or create the data room
    let dataRoom = await prisma.dataRoom.findUnique({ where: { companyId } })
    if (!dataRoom) {
      dataRoom = await prisma.dataRoom.create({
        data: { companyId, name: 'Data Room' },
      })
    }

    const drCategory = EVIDENCE_TO_DATAROOM_CATEGORY[evidenceCategory]
    let folder = await prisma.dataRoomFolder.findFirst({
      where: { dataRoomId: dataRoom.id, category: drCategory },
    })
    if (!folder) {
      folder = await prisma.dataRoomFolder.create({
        data: {
          dataRoomId: dataRoom.id,
          name: documentName,
          category: drCategory,
          sortOrder: 0,
        },
      })
    }

    const document = await prisma.dataRoomDocument.create({
      data: {
        companyId,
        folderId: folder.id,
        documentName,
        category: drCategory,
        evidenceCategory,
        expectedDocumentId,
        evidenceSource: 'direct',
        filePath: uploadData.path,
        fileName: displayFileName,
        fileSize: file.size,
        mimeType: file.type,
        uploadedByUserId: result.auth.user.id,
        lastUpdatedAt: new Date(),
        status: 'CURRENT',
      },
    })

    // Create document upload signal (non-blocking)
    createDocumentUploadSignal({
      companyId,
      documentId: document.id,
      documentName,
      evidenceCategory,
      expectedDocumentId: expectedDocumentId || null,
      source: 'direct',
      linkedTaskId: null,
      mimeType: file.type || null,
      fileSize: file.size || null,
    }).catch((err) => {
      console.error('[Signal] Failed to create document upload signal (non-blocking):', err instanceof Error ? err.message : String(err))
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'evidence upload')
  }
}
