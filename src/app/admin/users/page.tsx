import { prisma } from '@/lib/prisma'
import { UserTable } from '@/components/admin/UserTable'
import styles from '@/components/admin/admin-tables.module.css'

async function getUsers() {
  const limit = 20
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        createdAt: true,
        workspaces: {
          select: {
            workspace: {
              select: {
                planTier: true,
                subscriptionStatus: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.user.count(),
  ])

  return {
    users: users.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    pagination: {
      page: 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export default async function AdminUsersPage() {
  const { users, pagination } = await getUsers()

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Users</h1>
        <p>Manage user accounts and permissions</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.cardTitle}>All Users</p>
          <p className={styles.cardDescription}>
            {pagination.total} users registered in the system
          </p>
        </div>
        <div className={styles.cardContent}>
          <UserTable initialUsers={users} initialPagination={pagination} />
        </div>
      </div>
    </div>
  )
}
