import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { TicketDetailClient } from './TicketDetailClient'

async function getTicket(id: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          organizations: {
            select: {
              organization: {
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

  return ticket
}

async function getAdmins() {
  return prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: { id: true, email: true, name: true },
  })
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [ticket, admins] = await Promise.all([
    getTicket(id),
    getAdmins(),
  ])

  if (!ticket) {
    notFound()
  }

  // Serialize dates
  const serializedTicket = {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() || null,
    messages: ticket.messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  }

  return <TicketDetailClient ticket={serializedTicket} admins={admins} />
}
