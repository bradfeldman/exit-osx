import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { OrgTable } from '@/components/admin/OrgTable'

async function getOrganizations() {
  const limit = 20
  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            companies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.organization.count(),
  ])

  return {
    organizations: organizations.map(org => ({
      ...org,
      createdAt: org.createdAt.toISOString(),
    })),
    pagination: {
      page: 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export default async function AdminOrganizationsPage() {
  const { organizations, pagination } = await getOrganizations()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">
          Manage organizations and their members
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
          <CardDescription>
            {pagination.total} organizations in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgTable initialOrganizations={organizations} initialPagination={pagination} />
        </CardContent>
      </Card>
    </div>
  )
}
