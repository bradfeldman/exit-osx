import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { UpdateFrequency } from '@prisma/client'

// Calculate next update due date based on frequency
function calculateNextUpdateDue(frequency: UpdateFrequency, fromDate: Date = new Date()): Date | null {
  switch (frequency) {
    case 'MONTHLY':
      return new Date(fromDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    case 'QUARTERLY':
      return new Date(fromDate.getTime() + 90 * 24 * 60 * 60 * 1000)
    case 'ANNUALLY':
      return new Date(fromDate.getTime() + 365 * 24 * 60 * 60 * 1000)
    case 'ONE_TIME':
    case 'AS_NEEDED':
    default:
      return null
  }
}

// GET - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId, docId } = await params

    const document = await prisma.dataRoomDocument.findFirst({
      where: {
        id: docId,
        companyId,
        company: {
          deletedAt: null,
          workspace: {
            members: {
              some: {
                user: { authId: user.id }
              }
            }
          }
        }
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error fetching document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update document metadata or upload file
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId, docId } = await params

    // Check document access
    const existingDoc = await prisma.dataRoomDocument.findFirst({
      where: {
        id: docId,
        companyId,
        company: {
          deletedAt: null,
          workspace: {
            members: {
              some: {
                user: { authId: user.id }
              }
            }
          }
        }
      }
    })

    if (!existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      documentName,
      description,
      updateFrequency,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      notes,
      isFileUpload, // Flag to indicate this is a file upload
    } = body

    const updateData: Record<string, unknown> = {}

    if (documentName !== undefined) updateData.documentName = documentName
    if (description !== undefined) updateData.description = description
    if (notes !== undefined) updateData.notes = notes

    // Handle update frequency change
    if (updateFrequency !== undefined) {
      updateData.updateFrequency = updateFrequency
      // Recalculate next update due if there's an existing file
      if (existingDoc.fileUrl) {
        updateData.nextUpdateDue = calculateNextUpdateDue(updateFrequency, existingDoc.lastUpdatedAt || new Date())
      }
    }

    // Handle file upload
    // SECURITY: Validate fileUrl is a legitimate Supabase storage URL to prevent URL injection
    if (isFileUpload && fileUrl) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith(`${supabaseUrl}/storage/`)) {
        return NextResponse.json(
          { error: 'Invalid file URL — must be a valid storage path' },
          { status: 400 }
        )
      }
      updateData.fileUrl = fileUrl
      updateData.fileName = typeof fileName === 'string' ? fileName.slice(0, 500) : fileName
      updateData.fileSize = typeof fileSize === 'number' && fileSize >= 0 && fileSize <= 100_000_000 ? fileSize : null
      updateData.mimeType = typeof mimeType === 'string' ? mimeType.slice(0, 200) : mimeType
      updateData.lastUpdatedAt = new Date()
      updateData.status = 'CURRENT'

      // Get the user's internal ID
      const dbUser = await prisma.user.findUnique({
        where: { authId: user.id },
        select: { id: true }
      })
      if (dbUser) {
        updateData.uploadedByUserId = dbUser.id
      }

      // Calculate next update due
      const frequency = updateFrequency || existingDoc.updateFrequency
      updateData.nextUpdateDue = calculateNextUpdateDue(frequency)
    }

    const document = await prisma.dataRoomDocument.update({
      where: { id: docId },
      data: updateData
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error updating document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: companyId, docId } = await params

    // Check document access and if it's deletable (only custom docs can be fully deleted)
    const existingDoc = await prisma.dataRoomDocument.findFirst({
      where: {
        id: docId,
        companyId,
        company: {
          deletedAt: null,
          workspace: {
            members: {
              some: {
                user: { authId: user.id }
              }
            }
          }
        }
      }
    })

    if (!existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // If it's a custom document, delete it entirely
    if (existingDoc.isCustom) {
      // Delete from Supabase storage if there's a file
      if (existingDoc.fileUrl) {
        const filePath = existingDoc.fileUrl.split('/').slice(-2).join('/')
        await supabase.storage.from('data-room').remove([filePath])
      }

      await prisma.dataRoomDocument.delete({
        where: { id: docId }
      })

      return NextResponse.json({ success: true, deleted: true })
    }

    // For required documents, just clear the file but keep the document entry
    if (existingDoc.fileUrl) {
      const filePath = existingDoc.fileUrl.split('/').slice(-2).join('/')
      await supabase.storage.from('data-room').remove([filePath])
    }

    const document = await prisma.dataRoomDocument.update({
      where: { id: docId },
      data: {
        fileUrl: null,
        fileName: null,
        fileSize: null,
        mimeType: null,
        lastUpdatedAt: null,
        nextUpdateDue: null,
        status: 'CURRENT',
        uploadedByUserId: null,
      }
    })

    return NextResponse.json({ success: true, deleted: false, document })
  } catch (error) {
    console.error('Error deleting document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
