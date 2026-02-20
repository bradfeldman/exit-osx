import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkPermission, isAuthError } from '@/lib/auth/check-permission'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const conversations = await prisma.coachConversation.findMany({
    where: { companyId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })

  return NextResponse.json({
    conversations: conversations.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    })),
  })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: companyId } = await params
  const result = await checkPermission('COMPANY_VIEW', companyId)
  if (isAuthError(result)) return result.error

  const conversation = await prisma.coachConversation.create({
    data: { companyId },
    select: { id: true, title: true },
  })

  return NextResponse.json(conversation, { status: 201 })
}
