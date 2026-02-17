import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SIGNED_URL_EXPIRY_SECONDS } from '@/lib/security'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const uploadSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
})

// POST - Create a proof document for a sub-step and get upload URL
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId, stepId } = await params
    const validation = await validateRequestBody(request, uploadSchema)
    if (!validation.success) return validation.error
    const { fileName, mimeType, fileSize } = validation.data

    // Verify task access and get the sub-step
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
      include: { company: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const subStep = await prisma.taskSubStep.findFirst({
      where: { id: stepId, taskId },
    })

    if (!subStep) {
      return NextResponse.json({ error: 'Sub-step not found' }, { status: 404 })
    }

    // Get uploading user's DB record
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id }
    })

    // Create proof document record
    const proofDoc = await prisma.dataRoomDocument.create({
      data: {
        companyId: task.companyId,
        category: 'TASK_PROOF',
        documentName: `Sub-step: ${subStep.title}`,
        description: `Upload for sub-step: ${subStep.title}`,
        fileName,
        mimeType,
        fileSize: fileSize || null,
        linkedTaskId: taskId,
        uploadedByUserId: dbUser?.id || null,
        isCustom: true,
        status: 'NEEDS_UPDATE',
      }
    })

    // Generate file path
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${task.companyId}/task-proofs/${taskId}_${stepId}_${timestamp}_${sanitizedName}`

    // Create signed upload URL
    const serviceClient = createServiceClient()
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('data-room')
      .createSignedUploadUrl(filePath)

    if (uploadError) {
      await prisma.dataRoomDocument.delete({ where: { id: proofDoc.id } })
      console.error('Error creating signed upload URL:', uploadError)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    // Update document with file path
    await prisma.dataRoomDocument.update({
      where: { id: proofDoc.id },
      data: { filePath }
    })

    // Link document to sub-step and mark complete
    await prisma.taskSubStep.update({
      where: { id: stepId },
      data: {
        linkedDocId: proofDoc.id,
        completed: true,
        completedAt: new Date(),
      },
    })

    // Generate signed download URL for immediate display
    const { data: signedUrlData } = await serviceClient.storage
      .from('data-room')
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS)

    return NextResponse.json({
      proofDocument: { ...proofDoc, filePath },
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      filePath,
      signedUrl: signedUrlData?.signedUrl || null,
    })
  } catch (error) {
    console.error('Error creating sub-step upload:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
