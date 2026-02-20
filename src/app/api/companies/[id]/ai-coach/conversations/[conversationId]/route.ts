import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'
import { z } from 'zod'
import { validateRequestBody } from '@/lib/security/validation'

const patchSchema = z.object({
  title: z.string().min(1).max(200),
})

type RouteParams = { params: Promise<{ id: string; conversationId: string }> }

export async function GET(
  _request: Request,
  { params }: RouteParams
) {
  const { id: companyId, conversationId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const conversation = await prisma.coachConversation.findFirst({
    where: { id: conversationId, companyId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          contextSources: true,
          createdAt: true,
        },
      },
    },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  return NextResponse.json(conversation)
}

export async function PATCH(
  request: Request,
  { params }: RouteParams
) {
  const { id: companyId, conversationId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const validation = await validateRequestBody(request, patchSchema)
  if (!validation.success) return validation.error

  const conversation = await prisma.coachConversation.findFirst({
    where: { id: conversationId, companyId },
    select: { id: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  const updated = await prisma.coachConversation.update({
    where: { id: conversationId },
    data: { title: validation.data.title },
    select: { id: true, title: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams
) {
  const { id: companyId, conversationId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const conversation = await prisma.coachConversation.findFirst({
    where: { id: conversationId, companyId },
    select: { id: true },
  })

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  await prisma.coachConversation.delete({
    where: { id: conversationId },
  })

  return NextResponse.json({ success: true })
}
