import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { DealDocumentType } from '@prisma/client'
import { ACTIVITY_TYPES } from '@/lib/deal-tracker/constants'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const postSchema = z.object({
  documentType: z.enum(['NDA', 'IOI', 'LOI', 'PSA', 'DD_REQUEST', 'DD_RESPONSE', 'FINANCIAL', 'LEGAL', 'OTHER']),
  name: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  filePath: z.string().max(2000).optional(),
  fileName: z.string().max(500).optional(),
  fileSize: z.coerce.number().finite().optional(),
  mimeType: z.string().max(200).optional(),
  receivedAt: z.string().max(100).optional(),
  sentAt: z.string().max(100).optional(),
})

/**
 * GET /api/companies/[id]/deal-tracker/buyers/[buyerId]/documents
 * Get all documents for a buyer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const documentType = searchParams.get('type') as DealDocumentType | null

    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { buyerId }
    if (documentType) where.documentType = documentType

    const documents = await prisma.dealDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Get uploader info
    const uploaderIds = [...new Set(documents.map(d => d.uploadedById).filter(Boolean))]
    const uploaders = uploaderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: uploaderIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const uploaderMap = new Map(uploaders.map(u => [u.id, u]))

    const documentsWithUploaders = documents.map(doc => ({
      ...doc,
      uploadedBy: uploaderMap.get(doc.uploadedById) || null,
    }))

    return NextResponse.json({ documents: documentsWithUploaders })
  } catch (error) {
    console.error('Error fetching documents:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/companies/[id]/deal-tracker/buyers/[buyerId]/documents
 * Add a document record (file upload handled separately via storage)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, postSchema)
    if (!validation.success) return validation.error
    const {
      documentType,
      name,
      description,
      filePath,
      fileName,
      fileSize,
      mimeType,
      receivedAt,
      sentAt,
    } = validation.data

    // Verify buyer belongs to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const document = await prisma.dealDocument.create({
      data: {
        buyerId,
        documentType: documentType as DealDocumentType,
        name,
        description,
        filePath,
        fileName,
        fileSize,
        mimeType,
        receivedAt: receivedAt ? new Date(receivedAt) : null,
        sentAt: sentAt ? new Date(sentAt) : null,
        uploadedById: result.auth.user.id,
      },
    })

    // Log activity
    const activityType = receivedAt
      ? ACTIVITY_TYPES.DOCUMENT_RECEIVED
      : sentAt
      ? ACTIVITY_TYPES.DOCUMENT_SENT
      : ACTIVITY_TYPES.DOCUMENT_UPLOADED

    await prisma.dealActivity.create({
      data: {
        buyerId,
        activityType,
        description: `${receivedAt ? 'Received' : sentAt ? 'Sent' : 'Uploaded'} document: ${name}`,
        metadata: {
          documentId: document.id,
          documentType,
          name,
        },
        performedById: result.auth.user.id,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Error adding document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/deal-tracker/buyers/[buyerId]/documents
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  const { id: companyId, buyerId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Verify buyer and document belong to company
    const buyer = await prisma.prospectiveBuyer.findFirst({
      where: { id: buyerId, companyId },
    })

    if (!buyer) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 })
    }

    const document = await prisma.dealDocument.findFirst({
      where: { id: documentId, buyerId },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete document record (file cleanup should be handled separately)
    await prisma.dealDocument.delete({
      where: { id: documentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
