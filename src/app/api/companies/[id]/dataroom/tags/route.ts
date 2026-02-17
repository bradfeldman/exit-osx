import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const createTagSchema = z.object({
  name: z.string().min(1).max(50).transform(v => v.trim()),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be hex color').default('#6B7280'),
})

const updateDocumentTagSchema = z.object({
  documentId: z.string().cuid(),
  tagId: z.string().cuid(),
  action: z.enum(['add', 'remove']),
})

/**
 * GET /api/companies/[id]/dataroom/tags
 * Get all tags for the company
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const tags = await prisma.dataRoomTag.findMany({
      where: { companyId },
      include: {
        documents: {
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        documentCount: t.documents.length,
      })),
    })
  } catch (error) {
    console.error('Error fetching tags:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/companies/[id]/dataroom/tags
 * Create a new tag
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, createTagSchema)
    if (!validation.success) return validation.error
    const { name, color } = validation.data

    // Check for duplicate (companyId + name is unique)
    const existing = await prisma.dataRoomTag.findUnique({
      where: {
        companyId_name: {
          companyId,
          name,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400 })
    }

    const tag = await prisma.dataRoomTag.create({
      data: {
        companyId,
        name,
        color,
      },
    })

    return NextResponse.json({ tag }, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/companies/[id]/dataroom/tags
 * Add or remove tag from document
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, updateDocumentTagSchema)
    if (!validation.success) return validation.error
    const { documentId, tagId, action } = validation.data

    // Verify document belongs to company
    const document = await prisma.dataRoomDocument.findUnique({
      where: { id: documentId },
    })

    if (!document || document.companyId !== companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Verify tag belongs to company
    const tag = await prisma.dataRoomTag.findUnique({ where: { id: tagId } })
    if (!tag || tag.companyId !== companyId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    if (action === 'add') {
      await prisma.dataRoomDocumentTag.upsert({
        where: {
          documentId_tagId: { documentId, tagId },
        },
        create: { documentId, tagId },
        update: {},
      })
    } else {
      await prisma.dataRoomDocumentTag.deleteMany({
        where: { documentId, tagId },
      })
    }

    // Return updated document tags
    const updatedTags = await prisma.dataRoomDocumentTag.findMany({
      where: { documentId },
      include: { tag: true },
    })

    return NextResponse.json({
      tags: updatedTags.map((t) => t.tag),
    })
  } catch (error) {
    console.error('Error updating document tags:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/dataroom/tags
 * Delete a tag
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

    const tag = await prisma.dataRoomTag.findUnique({ where: { id: tagId } })
    if (!tag || tag.companyId !== companyId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Delete tag (cascade deletes document associations)
    await prisma.$transaction([
      prisma.dataRoomDocumentTag.deleteMany({ where: { tagId } }),
      prisma.dataRoomTag.delete({ where: { id: tagId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tag:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
