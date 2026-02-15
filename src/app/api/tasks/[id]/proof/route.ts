import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SIGNED_URL_EXPIRY_SECONDS } from '@/lib/security'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

// GET - Get proof documents for a task with signed download URLs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params

    // Verify access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        company: {
          deletedAt: null,
          workspace: {
            members: {
              some: { user: { authId: user.id } }
            }
          }
        }
      },
      include: {
        proofDocuments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Generate signed download URLs for each document with a filePath
    // Use service client for storage operations (bypasses RLS)
    // SECURITY: Reduced expiry from 1 hour to 5 minutes
    const serviceClient = createServiceClient()
    const documentsWithUrls = await Promise.all(
      task.proofDocuments.map(async (doc) => {
        if (doc.filePath && doc.status === 'CURRENT') {
          const { data: signedUrlData } = await serviceClient.storage
            .from('data-room')
            .createSignedUrl(doc.filePath, SIGNED_URL_EXPIRY_SECONDS)

          return {
            ...doc,
            signedUrl: signedUrlData?.signedUrl || null
          }
        }
        return { ...doc, signedUrl: null }
      })
    )

    return NextResponse.json({ proofDocuments: documentsWithUrls })
  } catch (error) {
    console.error('Error fetching proof documents:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const postProofDocumentSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
})

// POST - Create a proof document and get upload URL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params
    const validation = await validateRequestBody(request, postProofDocumentSchema)
    if (!validation.success) return validation.error
    const { fileName, mimeType, fileSize, description } = validation.data

    // Verify task access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        company: {
          deletedAt: null,
          workspace: {
            members: {
              some: { user: { authId: user.id } }
            }
          }
        }
      },
      include: {
        company: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get the uploading user's DB record
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id }
    })

    // Create the proof document record
    const proofDoc = await prisma.dataRoomDocument.create({
      data: {
        companyId: task.companyId,
        category: 'TASK_PROOF',
        documentName: `Proof: ${task.title}`,
        description: description || `Proof of completion for task: ${task.title}`,
        fileName,
        mimeType,
        fileSize: fileSize || null,
        linkedTaskId: taskId,
        uploadedByUserId: dbUser?.id || null,
        isCustom: true,
        status: 'NEEDS_UPDATE', // Will be updated to CURRENT when upload completes
      }
    })

    // Generate file path for storage
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${task.companyId}/task-proofs/${taskId}_${timestamp}_${sanitizedName}`

    // Create signed upload URL using service client (bypasses RLS)
    const serviceClient = createServiceClient()
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('data-room')
      .createSignedUploadUrl(filePath)

    if (uploadError) {
      // Clean up the document record if upload URL fails
      await prisma.dataRoomDocument.delete({ where: { id: proofDoc.id } })
      console.error('Error creating signed upload URL:', uploadError)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    // Store the file path - we'll generate signed URLs on demand for viewing
    // Update the document with the file path
    await prisma.dataRoomDocument.update({
      where: { id: proofDoc.id },
      data: { filePath }
    })

    return NextResponse.json({
      proofDocument: { ...proofDoc, filePath },
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      filePath,
    })
  } catch (error) {
    console.error('Error creating proof document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const patchProofDocumentSchema = z.object({
  documentId: z.string().uuid(),
  completeTask: z.boolean().optional(),
  completionNotes: z.string().max(5000).optional().nullable(),
})

// PATCH - Confirm upload is complete and update document status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params
    const validation = await validateRequestBody(request, patchProofDocumentSchema)
    if (!validation.success) return validation.error
    const { documentId, completeTask, completionNotes } = validation.data

    // Verify task and document access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        company: {
          deletedAt: null,
          workspace: {
            members: {
              some: { user: { authId: user.id } }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Mark the document as current (upload confirmed)
    // Note: We don't store public URLs anymore - signed URLs are generated on demand
    const updatedDoc = await prisma.dataRoomDocument.update({
      where: {
        id: documentId,
        linkedTaskId: taskId, // Ensure document belongs to this task
      },
      data: {
        status: 'CURRENT',
        lastUpdatedAt: new Date(),
      }
    })

    // Optionally complete the task
    let updatedTask = null
    if (completeTask) {
      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completionNotes: completionNotes || null,
        }
      })
    } else if (completionNotes) {
      // Just update notes without completing
      updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          completionNotes,
        }
      })
    }

    return NextResponse.json({
      proofDocument: updatedDoc,
      task: updatedTask,
    })
  } catch (error) {
    console.error('Error confirming proof upload:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a proof document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Verify task access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        company: {
          deletedAt: null,
          workspace: {
            members: {
              some: { user: { authId: user.id } }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Find the document
    const document = await prisma.dataRoomDocument.findFirst({
      where: {
        id: documentId,
        linkedTaskId: taskId,
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from storage if file exists
    if (document.filePath) {
      const serviceClient = createServiceClient()
      const { error: storageError } = await serviceClient.storage
        .from('data-room')
        .remove([document.filePath])

      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete the database record
    await prisma.dataRoomDocument.delete({
      where: { id: documentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting proof document:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
