import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { prisma } from '@/lib/prisma'
import { logActivity, notifyTeamMembers } from '@/lib/dataroom'

/**
 * GET /api/companies/[id]/dataroom/questions/[questionId]
 * Get a specific question with answers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id: companyId, questionId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  try {
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const question = await prisma.dataRoomQuestion.findUnique({
      where: { id: questionId },
      include: {
        answers: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!question || question.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Get document and folder info if needed
    const [document, folder] = await Promise.all([
      question.documentId
        ? prisma.dataRoomDocument.findUnique({
            where: { id: question.documentId },
            select: { id: true, documentName: true },
          })
        : null,
      question.folderId
        ? prisma.dataRoomFolder.findUnique({
            where: { id: question.folderId },
            select: { id: true, name: true },
          })
        : null,
    ])

    // Get user info
    const userIds = new Set<string>()
    if (question.askedByUserId) userIds.add(question.askedByUserId)
    question.answers.forEach((a: { answeredByUserId: string | null }) => {
      if (a.answeredByUserId) userIds.add(a.answeredByUserId)
    })

    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, email: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    return NextResponse.json({
      question: {
        ...question,
        document,
        folder,
        askedBy: question.askedByUserId
          ? userMap.get(question.askedByUserId) || { email: question.askedByEmail }
          : { email: question.askedByEmail },
        answers: question.answers.map((a: { answeredByUserId: string | null; answeredByEmail: string }) => ({
          ...a,
          answeredBy: a.answeredByUserId
            ? userMap.get(a.answeredByUserId) || { email: a.answeredByEmail }
            : { email: a.answeredByEmail },
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/companies/[id]/dataroom/questions/[questionId]
 * Answer a question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id: companyId, questionId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const body = await request.json()
    const { answer, isInternal = false } = body

    if (!answer || answer.trim().length === 0) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 })
    }

    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const questionToAnswer = await prisma.dataRoomQuestion.findUnique({
      where: { id: questionId },
    })

    if (!questionToAnswer || questionToAnswer.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const newAnswer = await prisma.dataRoomAnswer.create({
      data: {
        questionId,
        answer: answer.trim(),
        isInternal,
        answeredByUserId: result.auth.user.id,
        answeredByEmail: result.auth.user.email,
      },
    })

    // Log activity
    await logActivity({
      dataRoomId: dataRoom.id,
      userId: result.auth.user.id,
      userEmail: result.auth.user.email,
      action: 'ANSWERED_QUESTION',
      documentId: questionToAnswer.documentId || undefined,
      folderId: questionToAnswer.folderId || undefined,
      metadata: { questionId, answerId: newAnswer.id },
    })

    // Notify team members about the answer (unless it's internal)
    if (!isInternal) {
      await notifyTeamMembers({
        companyId,
        dataRoomId: dataRoom.id,
        type: 'QUESTION_ANSWERED',
        title: 'Question Answered',
        message: `${result.auth.user.email} answered: "${questionToAnswer.question.slice(0, 60)}${questionToAnswer.question.length > 60 ? '...' : ''}"`,
        actorEmail: result.auth.user.email,
        actorUserId: result.auth.user.id,
        questionId,
        documentId: questionToAnswer.documentId || undefined,
        folderId: questionToAnswer.folderId || undefined,
      }).catch((err) => console.error('Error sending notifications:', err))
    }

    return NextResponse.json({ answer: newAnswer }, { status: 201 })
  } catch (error) {
    console.error('Error answering question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/companies/[id]/dataroom/questions/[questionId]
 * Delete a question (only by asker or admin)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; questionId: string }> }
) {
  const { id: companyId, questionId } = await params
  const result = await checkPermission('COMPANY_UPDATE', companyId)
  if (isAuthError(result)) return result.error

  try {
    const dataRoom = await prisma.dataRoom.findUnique({
      where: { companyId },
    })

    if (!dataRoom) {
      return NextResponse.json({ error: 'Data room not found' }, { status: 404 })
    }

    const question = await prisma.dataRoomQuestion.findUnique({
      where: { id: questionId },
    })

    if (!question || question.dataRoomId !== dataRoom.id) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    // Delete answers first, then question
    await prisma.$transaction([
      prisma.dataRoomAnswer.deleteMany({ where: { questionId } }),
      prisma.dataRoomQuestion.delete({ where: { id: questionId } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting question:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
