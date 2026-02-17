import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { validateUploadedFile, handleApiError } from '@/lib/security'
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

const REFRESH_CADENCE_TO_FREQUENCY: Record<string, string> = {
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  ANNUALLY: 'YEARLY',
  NEVER: 'AS_NEEDED',
}

function computeNextUpdateDue(refreshCadence: string): Date | null {
  const now = new Date()
  switch (refreshCadence) {
    case 'MONTHLY':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    case 'QUARTERLY':
      return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
    case 'ANNUALLY':
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    default:
      return null
  }
}

/**
 * POST /api/companies/[id]/evidence/custom
 * Create a custom document slot. File is optional — if omitted,
 * a placeholder card is created that can accept a file later.
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
    const documentName = formData.get('documentName') as string | null
    const evidenceCategory = formData.get('evidenceCategory') as EvidenceCategory | null
    const refreshCadence = formData.get('refreshCadence') as string | null
    const file = formData.get('file') as File | null

    if (!documentName || !evidenceCategory) {
      return NextResponse.json({ error: 'Document name and category are required' }, { status: 400 })
    }

    if (!(evidenceCategory in EVIDENCE_TO_DATAROOM_CATEGORY)) {
      return NextResponse.json({ error: `Invalid evidence category: ${evidenceCategory}` }, { status: 400 })
    }

    // Find or create data room + folder
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

    let filePath: string | null = null
    let fileName: string | null = null
    let fileSize: number | null = null
    let mimeType: string | null = null

    // If a file was provided, upload it
    if (file && file.size > 0) {
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 })
      }

      const fileValidation = await validateUploadedFile(file)
      if (!fileValidation.valid) {
        return NextResponse.json({ error: fileValidation.error }, { status: 400 })
      }

      const supabase = await createClient()
      const safeFileName = fileValidation.sanitizedName || file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileExt = safeFileName.split('.').pop()
      const safeName = documentName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      const categoryPrefix = evidenceCategory.charAt(0).toUpperCase() + evidenceCategory.slice(1)
      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      const displayName = `${categoryPrefix}_${safeName}_${dateStr}.${fileExt}`
      const storagePath = `${companyId}/evidence/${displayName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('data-room')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
      }

      filePath = uploadData.path
      fileName = displayName
      fileSize = file.size
      mimeType = file.type
    }

    const nextUpdateDue = computeNextUpdateDue(refreshCadence || 'NEVER')

    const document = await prisma.dataRoomDocument.create({
      data: {
        companyId,
        folderId: folder.id,
        documentName,
        category: drCategory,
        evidenceCategory,
        evidenceSource: 'direct',
        isCustom: true,
        filePath,
        fileName,
        fileSize,
        mimeType,
        uploadedByUserId: result.auth.user.id,
        lastUpdatedAt: new Date(),
        nextUpdateDue,
        status: filePath ? 'CURRENT' : 'NEEDS_UPDATE',
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'custom evidence document')
  }
}
