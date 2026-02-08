import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserTable } from '@/components/admin/UserTable'

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
        organizations: {
          select: {
            organization: {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            {pagination.total} users registered in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable initialUsers={users} initialPagination={pagination} />
        </CardContent>
      </Card>
    </div>
  )
}
