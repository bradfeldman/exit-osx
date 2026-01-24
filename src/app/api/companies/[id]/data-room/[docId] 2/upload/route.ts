import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// POST - Get a signed upload URL for a document
export async function POST(
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
    const body = await request.json()
    const { fileName, mimeType } = body

    if (!fileName || !mimeType) {
      return NextResponse.json({ error: 'File name and MIME type are required' }, { status: 400 })
    }

    // Check document access
    const existingDoc = await prisma.dataRoomDocument.findFirst({
      where: {
        id: docId,
        companyId,
        company: {
          deletedAt: null,
          organization: {
            users: {
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

    // Generate a unique file path
    const fileExtension = fileName.split('.').pop() || ''
    const timestamp = Date.now()
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${companyId}/${docId}_${timestamp}_${sanitizedName}`

    // Delete old file if exists
    if (existingDoc.fileUrl) {
      const oldFilePath = existingDoc.fileUrl.split('/').slice(-2).join('/')
      await supabase.storage.from('data-room').remove([oldFilePath])
    }

    // Create signed upload URL
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('data-room')
      .createSignedUploadUrl(filePath)

    if (uploadError) {
      console.error('Error creating signed upload URL:', uploadError)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    // Get the public URL for after upload
    const { data: urlData } = supabase.storage
      .from('data-room')
      .getPublicUrl(filePath)

    return NextResponse.json({
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      filePath,
      publicUrl: urlData.publicUrl,
    })
  } catch (error) {
    console.error('Error generating upload URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
