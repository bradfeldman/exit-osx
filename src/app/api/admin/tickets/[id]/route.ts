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

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          workspaces: {
            select: {
              workspace: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      assignedTo: {
        select: { id: true, email: true, name: true },
      },
      messages: {
        include: {
          author: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) {
    return NextResponse.json(
      { error: 'Not found', message: 'Ticket not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({ ticket })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const { id } = await params
  const body = await request.json()

  const currentTicket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { status: true, priority: true, assignedToId: true, category: true, resolvedAt: true },
  })

  if (!currentTicket) {
    return NextResponse.json(
      { error: 'Not found', message: 'Ticket not found' },
      { status: 404 }
    )
  }

  const allowedFields = ['status', 'priority', 'assignedToId', 'category']
  const updateData: Record<string, unknown> = {}
  const changes: Record<string, { from: unknown; to: unknown }> = {}

  for (const field of allowedFields) {
    if (field in body && body[field] !== currentTicket[field as keyof typeof currentTicket]) {
      updateData[field] = body[field]
      changes[field] = {
        from: currentTicket[field as keyof typeof currentTicket],
        to: body[field],
      }
    }
  }

  // Handle resolved status
  if (updateData.status === 'resolved' && !currentTicket.resolvedAt) {
    updateData.resolvedAt = new Date()
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ ticket: currentTicket, message: 'No changes made' })
  }

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
      assignedTo: {
        select: { id: true, email: true, name: true },
      },
    },
  })

  // Determine action type for audit
  let action: 'ticket.update' | 'ticket.assign' | 'ticket.resolve' | 'ticket.close' = 'ticket.update'
  if ('assignedToId' in changes) action = 'ticket.assign'
  if (updateData.status === 'resolved') action = 'ticket.resolve'
  if (updateData.status === 'closed') action = 'ticket.close'

  await logAdminAction(result.admin, action, 'SupportTicket', ticket.id, {
    ticketNumber: ticket.ticketNumber,
    changes,
  })

  return NextResponse.json({ ticket })
}
