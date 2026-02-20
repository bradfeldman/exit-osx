import { prisma } from '@/lib/prisma'
import { Ticket, Activity, BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import styles from '@/components/admin/admin-misc.module.css'

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

function getTicketStatusClass(status: string): string {
  if (status === 'open') return styles.ticketStatusOpen
  if (status === 'in_progress') return styles.ticketStatusInProgress
  if (status === 'resolved') return styles.ticketStatusResolved
  return styles.ticketStatusDefault
}

export default async function CustomerServicePage() {
  const [stats, recentTickets] = await Promise.all([
    getStats(),
    getRecentTickets(),
  ])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Customer Service</h1>
        <p className={styles.pageSubtitle}>
          Manage support tickets, monitor activity, and track customer engagement
        </p>
      </div>

      {/* Stats */}
      <div className={`${styles.statsGrid} ${styles.statsGrid3}`}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <p className={styles.statCardLabel}>Open Tickets</p>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statValue}>{stats.openTickets}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <p className={styles.statCardLabel}>In Progress</p>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statValue}>{stats.inProgressTickets}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <p className={styles.statCardLabel}>Activity (24h)</p>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statValue}>{stats.recentActivity}</div>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div>
        <h2 className={styles.sectionHeading}>Tools</h2>
        <div className={`${styles.toolsGrid} ${styles.toolsGrid3}`}>
          {tools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className={`${styles.toolCard} ${tool.disabled ? styles.toolCardDisabled : ''}`}
            >
              <div className={styles.toolCardHeader}>
                <div className={styles.toolCardIconRow}>
                  <tool.icon className={`h-8 w-8 ${styles.toolCardIconBlue}`} />
                  {!tool.disabled && (
                    <ArrowRight className={`h-5 w-5 ${styles.toolCardIconGray}`} />
                  )}
                </div>
                <p className={styles.toolCardTitle}>{tool.title}</p>
                <p className={styles.toolCardDescription}>{tool.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Tickets */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderInner}>
            <p className={styles.cardTitle}>Recent Tickets</p>
            <p className={styles.cardDescription}>Latest support requests</p>
          </div>
        </div>
        <div className={styles.cardContent}>
          {recentTickets.length === 0 ? (
            <p className={styles.pageSubtitle}>No tickets yet</p>
          ) : (
            <div>
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/tickets/${ticket.id}`}
                  className={styles.recentTicketItem}
                >
                  <div className={styles.recentTicketInfo}>
                    <p className={styles.recentTicketSubject}>{ticket.subject}</p>
                    <p className={styles.recentTicketUser}>
                      {ticket.user?.name || ticket.user?.email || 'Unknown user'}
                    </p>
                  </div>
                  <span className={`${styles.ticketStatusPill} ${getTicketStatusClass(ticket.status)}`}>
                    {ticket.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {recentTickets.length > 0 && (
            <Link href="/admin/tickets" className={styles.viewAllLink}>
              View all tickets
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
