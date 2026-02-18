import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { ProductActivityFeed } from '@/components/admin/analytics/ProductActivityFeed'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Activity</h1>
        <p className="text-muted-foreground">
          Real-time feed of user product events
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Events</CardTitle>
          <CardDescription>
            What users are doing, when, and on what device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductActivityFeed
            initialEvents={serializedEvents}
            initialPagination={{
              page: 1,
              limit: 50,
              total,
              totalPages: Math.ceil(total / 50),
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
