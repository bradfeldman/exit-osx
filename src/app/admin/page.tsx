import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Ticket, Activity, Building, FlaskConical } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

async function getDashboardData() {
  try {
    const [
      userCount,
      workspaceCount,
      openTicketCount,
      recentActivityCount,
      companyCount,
      activeTrialCount,
      recentUsers,
      recentTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.supportTicket.count({
        where: { status: { in: ['open', 'in_progress', 'waiting'] } },
      }),
      prisma.auditLog.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.company.count({ where: { deletedAt: null } }),
      prisma.workspace.count({ where: { subscriptionStatus: 'TRIALING' } }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          workspaces: {
            select: {
              workspace: {
                select: { planTier: true },
              },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.supportTicket.findMany({
        where: { status: { in: ['open', 'in_progress', 'waiting'] } },
        select: {
          id: true,
          subject: true,
          userEmail: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    return {
      userCount,
      workspaceCount,
      openTicketCount,
      recentActivityCount,
      companyCount,
      activeTrialCount,
      recentUsers,
      recentTickets,
    }
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
    return {
      userCount: 0,
      workspaceCount: 0,
      openTicketCount: 0,
      recentActivityCount: 0,
      companyCount: 0,
      activeTrialCount: 0,
      recentUsers: [],
      recentTickets: [],
    }
  }
}

const planTierLabel: Record<string, string> = {
  FOUNDATION: 'Foundation',
  GROWTH: 'Growth',
  DEAL_ROOM: 'Deal Room',
}

export default async function AdminDashboard() {
  const data = await getDashboardData()

  const stats = [
    { label: 'Total Users', value: data.userCount, icon: Users },
    { label: 'Workspaces', value: data.workspaceCount, icon: Building2 },
    { label: 'Open Tickets', value: data.openTicketCount, icon: Ticket },
    { label: 'Activity (24h)', value: data.recentActivityCount, icon: Activity },
    { label: 'Companies', value: data.companyCount, icon: Building },
    { label: 'Active Trials', value: data.activeTrialCount, icon: FlaskConical },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Exit OSx administration portal
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Users */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Users</CardTitle>
              <Link
                href="/admin/users"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentUsers.map((user) => {
                  const tier = user.workspaces[0]?.workspace.planTier
                  return (
                    <Link
                      key={user.id}
                      href={`/admin/users/${user.id}`}
                      className="flex items-center justify-between py-1 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {user.name || 'No name'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        {tier && (
                          <Badge variant="secondary" className="text-xs">
                            {planTierLabel[tier] || tier}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tickets */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Open Tickets</CardTitle>
              <Link
                href="/admin/tickets"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tickets</p>
            ) : (
              <div className="space-y-3">
                {data.recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/admin/tickets/${ticket.id}`}
                    className="flex items-center justify-between py-1 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {ticket.subject}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {ticket.userEmail}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
