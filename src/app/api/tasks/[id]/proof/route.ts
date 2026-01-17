import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET - Get proof documents for a task
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
          organization: {
            users: {
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

    return NextResponse.json({ proofDocuments: task.proofDocuments })
  } catch (error) {
    console.error('Error fetching proof documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const body = await request.json()
    const { fileName, mimeType, fileSize, description } = body

    if (!fileName || !mimeType) {
      return NextResponse.json({ error: 'File name and MIME type are required' }, { status: 400 })
    }

    // Verify task access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        company: {
          deletedAt: null,
          organization: {
            users: {
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

    // Create signed upload URL
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('data-room')
      .createSignedUploadUrl(filePath)

    if (uploadError) {
      // Clean up the document record if upload URL fails
      await prisma.dataRoomDocument.delete({ where: { id: proofDoc.id } })
      console.error('Error creating signed upload URL:', uploadError)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('data-room')
      .getPublicUrl(filePath)

    return NextResponse.json({
      proofDocument: proofDoc,
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      filePath,
      publicUrl: urlData.publicUrl,
    })
  } catch (error) {
    console.error('Error creating proof document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Confirm upload is complete and update document
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
    const body = await request.json()
    const { documentId, publicUrl, completeTask, completionNotes } = body

    if (!documentId || !publicUrl) {
      return NextResponse.json({ error: 'Document ID and public URL are required' }, { status: 400 })
    }

    // Verify task and document access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        company: {
          deletedAt: null,
          organization: {
            users: {
              some: { user: { authId: user.id } }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Update the document with the file URL and mark as current
    const updatedDoc = await prisma.dataRoomDocument.update({
      where: {
        id: documentId,
        linkedTaskId: taskId, // Ensure document belongs to this task
      },
      data: {
        fileUrl: publicUrl,
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
    console.error('Error confirming proof upload:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
