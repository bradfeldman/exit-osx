import { prisma } from '@/lib/prisma'
import { ProductActivityFeed } from '@/components/admin/analytics/ProductActivityFeed'
import styles from '@/components/admin/admin-misc.module.css'

export default async function AnalyticsActivityPage() {
  const [events, total] = await Promise.all([
    prisma.productEvent.findMany({
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.productEvent.count(),
  ])

  const serializedEvents = events.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
  }))

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Live Activity</h1>
        <p className={styles.pageSubtitle}>Real-time feed of user product events</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderInner}>
            <p className={styles.cardTitle}>Product Events</p>
            <p className={styles.cardDescription}>
              What users are doing, when, and on what device
            </p>
          </div>
        </div>
        <div className={styles.cardContent}>
          <ProductActivityFeed
            initialEvents={serializedEvents}
            initialPagination={{
              page: 1,
              limit: 50,
              total,
              totalPages: Math.ceil(total / 50),
            }}
          />
        </div>
      </div>
    </div>
  )
}
