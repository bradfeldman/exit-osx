import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity, notifyTeamMembers } from '@/lib/dataroom'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

/**
 * GET /api/companies/[id]/dataroom/questions
 * Get Q&A for the data room
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'open', 'answered', 'all'
    const documentId = searchParams.get('documentId')
    const folderId = searchParams.get('folderId')

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    // Build where clause
    const where: Record<string, unknown> = { dataRoomId: dataRoom.id }

    if (status === 'open') {
      where.answers = { none: {} }
    } else if (status === 'answered') {
      where.answers = { some: {} }
    }

    if (documentId) where.documentId = documentId
    if (folderId) where.folderId = folderId

    const questions = await prisma.dataRoomQuestion.findMany({
      where,
      include: {
        answers: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get document and folder info separately
    const docIds = [...new Set(questions.filter((q) => q.documentId).map((q) => q.documentId))] as string[]
    const folderIdsToFetch = [...new Set(questions.filter((q) => q.folderId).map((q) => q.folderId))] as string[]

    const [documents, folders] = await Promise.all([
      docIds.length > 0
        ? prisma.dataRoomDocument.findMany({
            where: { id: { in: docIds } },
            select: { id: true, documentName: true },
          })
        : [],
      folderIdsToFetch.length > 0
        ? prisma.dataRoomFolder.findMany({
            where: { id: { in: folderIdsToFetch } },
            select: { id: true, name: true },
          })
        : [],
    ])

    const docMap = new Map(documents.map((d) => [d.id, d]))
    const folderMap = new Map(folders.map((f) => [f.id, f]))

    // Get user info for questions and answers
    const userIds = new Set<string>()
    questions.forEach((q) => {
      if (q.askedByUserId) userIds.add(q.askedByUserId)
      q.answers.forEach((a: { answeredByUserId: string | null }) => {
        if (a.answeredByUserId) userIds.add(a.answeredByUserId)
      })
    })

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, email: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    const questionsWithUsers = questions.map((q) => ({
      ...q,
      document: q.documentId ? docMap.get(q.documentId) : null,
      folder: q.folderId ? folderMap.get(q.folderId) : null,
      askedBy: q.askedByUserId
        ? userMap.get(q.askedByUserId) || { email: q.askedByEmail }
        : { email: q.askedByEmail },
      answers: q.answers.map((a: { answeredByUserId: string | null; answeredByEmail: string }) => ({
        ...a,
        answeredBy: a.answeredByUserId
          ? userMap.get(a.answeredByUserId) || { email: a.answeredByEmail }
          : { email: a.answeredByEmail },
      })),
    }))

    // Get counts
    const openCount = await prisma.dataRoomQuestion.count({
      where: { dataRoomId: dataRoom.id, answers: { none: {} } },
    })
    const answeredCount = await prisma.dataRoomQuestion.count({
      where: { dataRoomId: dataRoom.id, answers: { some: {} } },
    })

    return NextResponse.json({
      questions: questionsWithUsers,
      counts: {
        open: openCount,
        answered: answeredCount,
        total: openCount + answeredCount,
      },
    })
  } catch (error) {
    console.error('Error fetching questions:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createQuestionSchema = z.object({
  question: z.string().min(1).max(5000),
  documentId: z.string().uuid().optional().nullable(),
  folderId: z.string().uuid().optional().nullable(),
})

/**
 * POST /api/companies/[id]/dataroom/questions
 * Ask a new question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const validation = await validateRequestBody(request, createQuestionSchema)
    if (!validation.success) return validation.error
    const { question, documentId, folderId } = validation.data

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    // Validate document/folder if provided
    if (documentId) {
      const doc = await prisma.dataRoomDocument.findUnique({
        where: { id: documentId },
        include: { folder: true },
      })
      if (!doc || doc.folder?.dataRoomId !== dataRoom.id) {
        return NextResponse.json({ error: 'Invalid document' }, { status: 400 })
      }
    }

    if (folderId) {
      const folder = await prisma.dataRoomFolder.findUnique({ where: { id: folderId } })
      if (!folder || folder.dataRoomId !== dataRoom.id) {
        return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
      }
    }

    const newQuestion = await prisma.dataRoomQuestion.create({
      data: {
        dataRoomId: dataRoom.id,
        question: question.trim(),
        documentId,
        folderId,
        askedByUserId: result.auth.user.id,
        askedByEmail: result.auth.user.email,
      },
    })

    // Log activity
    await logActivity({
      dataRoomId: dataRoom.id,
      userId: result.auth.user.id,
      userEmail: result.auth.user.email,
      action: 'ASKED_QUESTION',
      documentId: documentId || undefined,
      folderId: folderId || undefined,
      metadata: { questionId: newQuestion.id },
    })

    // Notify team members about the new question
    await notifyTeamMembers({
      companyId,
      dataRoomId: dataRoom.id,
      type: 'QUESTION_ASKED',
      title: 'New Question Asked',
      message: `${result.auth.user.email} asked: "${question.trim().slice(0, 100)}${question.trim().length > 100 ? '...' : ''}"`,
      actorEmail: result.auth.user.email,
      actorUserId: result.auth.user.id,
      questionId: newQuestion.id,
      documentId: documentId || undefined,
      folderId: folderId || undefined,
    }).catch((err) => console.error('Error sending notifications:', err instanceof Error ? err.message : String(err)))

    return NextResponse.json({ question: newQuestion }, { status: 201 })
  } catch (error) {
    console.error('Error creating question:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
