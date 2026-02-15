import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { DataRoomAction } from '@prisma/client'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const VALID_ACTIONS = new Set<string>(Object.values(DataRoomAction))

const logActivitySchema = z.object({
  action: z.enum([
    'VIEWED_FOLDER',
    'VIEWED_DOCUMENT',
    'DOWNLOADED_DOCUMENT',
    'UPLOADED_DOCUMENT',
    'DELETED_DOCUMENT',
    'UPDATED_DOCUMENT',
    'CREATED_FOLDER',
    'DELETED_FOLDER',
    'GRANTED_ACCESS',
    'REVOKED_ACCESS',
    'ASKED_QUESTION',
    'ANSWERED_QUESTION',
    'EXPORTED_REPORT',
    'STAGE_CHANGED',
  ]),
  documentId: z.string().uuid().optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
  metadata: z.any().optional().nullable(),
})

// POST - Log a data room activity
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

    const { id: companyId } = await params

    // Check company access
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        workspace: {
          members: {
            some: {
              user: { authId: user.id }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const validation = await validateRequestBody(request, logActivitySchema)
    if (!validation.success) return validation.error
    const { action, documentId, folderId, metadata } = validation.data

    // Get or create data room for company
    let dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId }
    })

    if (!dataRoom) {
      dataRoom = await prisma.dataRoom.create({
        data: {
          companyId,
          name: 'Data Room',
          stage: 'PREPARATION',
        }
      })
    }

    // Get user's internal ID
    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
      select: { id: true }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create activity record
    const activity = await prisma.dataRoomActivity.create({
      data: {
        dataRoomId: dataRoom.id,
        userId: dbUser.id,
        userEmail: user.email || '',
        action,
        documentId: documentId || null,
        folderId: folderId || null,
        metadata: metadata || null,
        ipAddress: request.headers.get('x-forwarded-for') || null,
        userAgent: request.headers.get('user-agent') || null,
      }
    })

    // If viewing a document, also update/create document view record
    if (action === 'VIEWED_DOCUMENT' && documentId) {
      const existingView = await prisma.dataRoomDocumentView.findUnique({
        where: {
          documentId_userId: {
            documentId,
            userId: dbUser.id,
          }
        }
      })

      if (existingView) {
        await prisma.dataRoomDocumentView.update({
          where: { id: existingView.id },
          data: {
            viewCount: { increment: 1 },
            lastViewedAt: new Date(),
          }
        })
      } else {
        await prisma.dataRoomDocumentView.create({
          data: {
            documentId,
            userId: dbUser.id,
            userEmail: user.email || '',
            viewCount: 1,
            lastViewedAt: new Date(),
          }
        })
      }
    }

    return NextResponse.json({ activity })
  } catch (error) {
    console.error('Error logging data room activity:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get activity log for a company's data room
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

    const { id: companyId } = await params

    // Check company access
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        deletedAt: null,
        workspace: {
          members: {
            some: {
              user: { authId: user.id }
            }
          }
        }
      }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get data room
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId }
    })

    if (!dataRoom) {
      return NextResponse.json({ activities: [] })
    }

    // Get activities (last 100)
    const activities = await prisma.dataRoomActivity.findMany({
      where: { dataRoomId: dataRoom.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Error fetching data room activities:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
