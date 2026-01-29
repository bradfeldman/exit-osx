import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Headset,
  TrendingUp,
  SlidersHorizontal,
  Users,
  FlaskConical,
  ArrowRight,
  Ticket,
  Activity,
  Building2,
  Scale,
  Calculator,
  Camera,
  ListTodo,
} from 'lucide-react'
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

const modules = [
  {
    title: 'Customer Service',
    description: 'Support tickets, activity monitoring, and customer analytics',
    icon: Headset,
    href: '/admin/customer-service',
    color: 'bg-blue-500',
    items: [
      { label: 'Support Tickets', href: '/admin/tickets', icon: Ticket },
      { label: 'Activity Log', href: '/admin/activity', icon: Activity },
    ],
  },
  {
    title: 'Sales & Marketing',
    description: 'Marketing tools, analytics, and campaign management',
    icon: TrendingUp,
    href: '/admin/sales-marketing',
    color: 'bg-green-500',
    items: [],
  },
  {
    title: 'Variable Management',
    description: 'BRI weights, industry multiples, and valuation adjustments',
    icon: SlidersHorizontal,
    href: '/admin/variables',
    color: 'bg-purple-500',
    items: [
      { label: 'BRI Weights', href: '/admin/tools/bri-weights', icon: Scale },
      { label: 'Industry Multiples', href: '/admin/tools/industry-multiples', icon: TrendingUp },
      { label: 'Multiple Adjustment', href: '/admin/tools/multiple-adjustment', icon: Calculator },
      { label: 'Global BRI Weighting', href: '/admin/tools/bri-weighting', icon: SlidersHorizontal },
    ],
  },
  {
    title: 'User Management',
    description: 'Users, organizations, and access control',
    icon: Users,
    href: '/admin/users',
    color: 'bg-orange-500',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Organizations', href: '/admin/organizations', icon: Building2 },
    ],
  },
  {
    title: 'R&D',
    description: 'Developer tools, snapshots, and task management',
    icon: FlaskConical,
    href: '/admin/rd',
    color: 'bg-red-500',
    items: [
      { label: 'Snapshot', href: '/admin/tools/snapshot', icon: Camera },
      { label: 'Task Viewer', href: '/admin/tools/task-viewer', icon: ListTodo },
    ],
  },
]

export default async function AdminDashboard() {
  const stats = await getStats()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Exit OSx administration portal
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.userCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orgCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTicketCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activity (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivityCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Modules</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.title} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${module.color} text-white`}>
                    <module.icon className="h-6 w-6" />
                  </div>
                  <Link
                    href={module.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
                <CardTitle className="mt-4">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {module.items.length > 0 ? (
                  <div className="space-y-2">
                    {module.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Coming soon</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
