import { prisma } from '@/lib/prisma'
import { TicketTable } from '@/components/admin/TicketTable'
import styles from '@/components/admin/admin-misc.module.css'

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
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Support Tickets</h1>
        <p className={styles.pageSubtitle}>Manage customer support requests</p>
      </div>

      {/* Stats */}
      <div className={`${styles.statsGrid} ${styles.statsGrid3}`}>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <p className={styles.statCardLabel}>Open</p>
          </div>
          <div className={styles.statCardContent}>
            <div className={`${styles.statValue} ${styles.statValueBlue}`}>{stats.open}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <p className={styles.statCardLabel}>In Progress</p>
          </div>
          <div className={styles.statCardContent}>
            <div className={`${styles.statValue} ${styles.statValueYellow}`}>{stats.inProgress}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardHeader}>
            <p className={styles.statCardLabel}>Waiting</p>
          </div>
          <div className={styles.statCardContent}>
            <div className={`${styles.statValue} ${styles.statValuePurple}`}>{stats.waiting}</div>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderInner}>
            <p className={styles.cardTitle}>All Tickets</p>
            <p className={styles.cardDescription}>
              {pagination.total} tickets in the system
            </p>
          </div>
        </div>
        <div className={styles.cardContent}>
          <TicketTable initialTickets={tickets} initialPagination={pagination} />
        </div>
      </div>
    </div>
  )
}
