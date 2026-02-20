import { prisma } from '@/lib/prisma'
import { Users, Building2, Ticket, Activity, Building, FlaskConical } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import styles from '@/components/admin/admin-dashboard.module.css'

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
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Admin Dashboard</h1>
        <p>Welcome to the Exit OSx administration portal</p>
      </div>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={styles.statCardHeader}>
              <div className={styles.statCardHeaderInner}>
                <span className={styles.statLabel}>{stat.label}</span>
                <stat.icon className={styles.statIcon} />
              </div>
            </div>
            <div className={styles.statCardContent}>
              <div className={styles.statValue}>{stat.value.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Sections */}
      <div className={styles.twoColGrid}>
        {/* Recent Users */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardTitleBase}>Recent Users</span>
            <Link href="/admin/users" className={styles.viewAllLink}>
              View all
            </Link>
          </div>
          <div className={styles.cardContent}>
            {data.recentUsers.length === 0 ? (
              <p className={styles.emptyText}>No users yet</p>
            ) : (
              <div className={styles.itemList}>
                {data.recentUsers.map((user) => {
                  const tier = user.workspaces[0]?.workspace.planTier
                  return (
                    <Link
                      key={user.id}
                      href={`/admin/users/${user.id}`}
                      className={styles.itemRow}
                    >
                      <div className={styles.itemMain}>
                        <span className={styles.itemPrimary}>
                          {user.name || 'No name'}
                        </span>
                        <span className={styles.itemSecondary}>{user.email}</span>
                      </div>
                      <div className={styles.itemMeta}>
                        {tier && (
                          <Badge variant="secondary" className="text-xs">
                            {planTierLabel[tier] || tier}
                          </Badge>
                        )}
                        <span className={styles.itemDate}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Open Tickets */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <span className={styles.cardTitleBase}>Open Tickets</span>
            <Link href="/admin/tickets" className={styles.viewAllLink}>
              View all
            </Link>
          </div>
          <div className={styles.cardContent}>
            {data.recentTickets.length === 0 ? (
              <p className={styles.emptyText}>No open tickets</p>
            ) : (
              <div className={styles.itemList}>
                {data.recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/admin/tickets/${ticket.id}`}
                    className={styles.itemRow}
                  >
                    <div className={styles.itemMain}>
                      <span className={styles.itemPrimary}>{ticket.subject}</span>
                      <span className={styles.itemSecondary}>{ticket.userEmail}</span>
                    </div>
                    <div className={styles.itemMeta}>
                      <Badge variant="outline" className="text-xs capitalize">
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <span className={styles.itemDate}>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
