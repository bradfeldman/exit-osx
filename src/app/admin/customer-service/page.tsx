import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Ticket, Activity, BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const [openTickets, inProgressTickets, recentActivity] = await Promise.all([
    prisma.supportTicket.count({
      where: { status: 'open' },
    }),
    prisma.supportTicket.count({
      where: { status: 'in_progress' },
    }),
    prisma.auditLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  return { openTickets, inProgressTickets, recentActivity }
}

async function getRecentTickets() {
  return prisma.supportTicket.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  })
}

const tools = [
  {
    title: 'Support Tickets',
    description: 'View and manage customer support requests',
    icon: Ticket,
    href: '/admin/tickets',
  },
  {
    title: 'Activity Log',
    description: 'Monitor user and system activity',
    icon: Activity,
    href: '/admin/activity',
  },
  {
    title: 'Customer Analytics',
    description: 'Coming soon - Customer behavior insights',
    icon: BarChart3,
    href: '#',
    disabled: true,
  },
]

export default async function CustomerServicePage() {
  const [stats, recentTickets] = await Promise.all([
    getStats(),
    getRecentTickets(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Customer Service</h1>
        <p className="text-muted-foreground">
          Manage support tickets, monitor activity, and track customer engagement
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activity (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tools */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Tools</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className={tool.disabled ? 'pointer-events-none' : ''}
            >
              <Card className={`h-full transition-shadow ${tool.disabled ? 'opacity-50' : 'hover:shadow-lg'}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <tool.icon className="h-8 w-8 text-blue-500" />
                    {!tool.disabled && <ArrowRight className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <CardTitle className="mt-4">{tool.title}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
          <CardDescription>Latest support requests</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet</p>
          ) : (
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/tickets/${ticket.id}`}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0 hover:bg-muted/50 -mx-2 px-2 py-2 rounded"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket.user?.name || ticket.user?.email || 'Unknown user'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    ticket.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                    ticket.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {ticket.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {recentTickets.length > 0 && (
            <div className="mt-4">
              <Link href="/admin/tickets" className="text-sm text-primary hover:underline">
                View all tickets
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
