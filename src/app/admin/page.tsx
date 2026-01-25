import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, Ticket, Activity } from 'lucide-react'
import Link from 'next/link'

async function getStats() {
  const [
    userCount,
    orgCount,
    openTicketCount,
    recentActivityCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.supportTicket.count({
      where: { status: { in: ['open', 'in_progress', 'waiting'] } },
    }),
    prisma.auditLog.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  return { userCount, orgCount, openTicketCount, recentActivityCount }
}

async function getRecentActivity() {
  return prisma.auditLog.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      actor: {
        select: { email: true, name: true },
      },
    },
  })
}

export default async function AdminDashboard() {
  const [stats, recentActivity] = await Promise.all([
    getStats(),
    getRecentActivity(),
  ])

  const statCards = [
    {
      title: 'Total Users',
      value: stats.userCount,
      icon: Users,
      href: '/admin/users',
      color: 'text-blue-500',
    },
    {
      title: 'Organizations',
      value: stats.orgCount,
      icon: Building2,
      href: '/admin/organizations',
      color: 'text-green-500',
    },
    {
      title: 'Open Tickets',
      value: stats.openTicketCount,
      icon: Ticket,
      href: '/admin/tickets',
      color: 'text-yellow-500',
    },
    {
      title: 'Activity (24h)',
      value: stats.recentActivityCount,
      icon: Activity,
      href: '/admin/activity',
      color: 'text-purple-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your customer service operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest admin actions across the system</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((log: { id: string; action: string; targetType: string; targetId: string | null; createdAt: Date; actor: { email: string; name: string | null } }) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {log.actor.name || log.actor.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatAction(log.action)} {log.targetType}
                      {log.targetId && (
                        <span className="text-xs"> (ID: {log.targetId.slice(0, 8)}...)</span>
                      )}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {formatRelativeTime(log.createdAt)}
                  </time>
                </div>
              ))}
            </div>
          )}
          {recentActivity.length > 0 && (
            <div className="mt-4">
              <Link
                href="/admin/activity"
                className="text-sm text-primary hover:underline"
              >
                View all activity
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function formatAction(action: string): string {
  return action
    .split('.')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}
