import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, isAdminError, logAdminAction } from '@/lib/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params

  const messages = await prisma.ticketMessage.findMany({
    where: { ticketId: id },
    include: {
      author: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ messages })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params
  const body = await request.json()
  const { content, isInternal } = body

  if (!content || content.trim().length === 0) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Message content is required' },
      { status: 400 }
    )
  }

  // Verify ticket exists
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, ticketNumber: true },
  })

  if (!ticket) {
    return NextResponse.json(
      { error: 'Not found', message: 'Ticket not found' },
      { status: 404 }
    )
  }

  const message = await prisma.ticketMessage.create({
    data: {
      ticketId: id,
      authorId: result.admin.user.id,
      authorEmail: result.admin.user.email,
      content: content.trim(),
      isInternal: isInternal || false,
    },
    include: {
      author: {
        select: { id: true, email: true, name: true },
      },
    },
  })

  // Update ticket's updatedAt timestamp
  await prisma.supportTicket.update({
    where: { id },
    data: { updatedAt: new Date() },
  })

  await logAdminAction(result.admin, 'ticket.message', 'SupportTicket', ticket.id, {
    ticketNumber: ticket.ticketNumber,
    messageId: message.id,
    isInternal: message.isInternal,
  })

  return NextResponse.json({ message }, { status: 201 })
}
