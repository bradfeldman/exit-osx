import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin, isAdminError, logAdminAction } from '@/lib/admin'
import { sanitizePagination } from '@/lib/security/validation'

function generateTicketNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `TKT-${year}${month}-${random}`
}

export async function GET(request: NextRequest) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const searchParams = request.nextUrl.searchParams
  // SECURITY: Validate pagination to prevent DoS
  const { page, limit, skip } = sanitizePagination({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
  })
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const assignedToId = searchParams.get('assignedToId')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (priority) where.priority = priority
  if (assignedToId) where.assignedToId = assignedToId

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        assignedTo: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    }),
    prisma.supportTicket.count({ where }),
  ])

  return NextResponse.json({
    tickets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const result = await requireSuperAdmin()
  if (isAdminError(result)) return result.error

  const body = await request.json()
  const { userId, userEmail, subject, category, priority } = body

  if (!userEmail || !subject) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'userEmail and subject are required' },
      { status: 400 }
    )
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: generateTicketNumber(),
      userId,
      userEmail,
      subject,
      category,
      priority: priority || 'normal',
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  })

  await logAdminAction(result.admin, 'ticket.create', 'SupportTicket', ticket.id, {
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    userEmail: ticket.userEmail,
  })

  return NextResponse.json({ ticket }, { status: 201 })
}
