import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TicketTable } from '@/components/admin/TicketTable'

async function getTickets() {
  const limit = 20
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
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
      take: limit,
    }),
    prisma.supportTicket.count(),
  ])

  return {
    tickets: tickets.map(ticket => ({
      ...ticket,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString() || null,
    })),
    pagination: {
      page: 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

async function getStats() {
  const [open, inProgress, waiting] = await Promise.all([
    prisma.supportTicket.count({ where: { status: 'open' } }),
    prisma.supportTicket.count({ where: { status: 'in_progress' } }),
    prisma.supportTicket.count({ where: { status: 'waiting' } }),
  ])
  return { open, inProgress, waiting }
}

export default async function AdminTicketsPage() {
  const [{ tickets, pagination }, stats] = await Promise.all([
    getTickets(),
    getStats(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">
          Manage customer support requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Waiting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.waiting}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tickets</CardTitle>
          <CardDescription>
            {pagination.total} tickets in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TicketTable initialTickets={tickets} initialPagination={pagination} />
        </CardContent>
      </Card>
    </div>
  )
}
