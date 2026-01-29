import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, Mail, BarChart3, Megaphone, Target } from 'lucide-react'

const upcomingFeatures = [
  {
    title: 'Marketing Dashboard',
    description: 'Track campaign performance, conversion rates, and ROI',
    icon: BarChart3,
  },
  {
    title: 'User Acquisition',
    description: 'Monitor signups, activation rates, and user sources',
    icon: Users,
  },
  {
    title: 'Email Campaigns',
    description: 'Create and manage email marketing campaigns',
    icon: Mail,
  },
  {
    title: 'Conversion Funnels',
    description: 'Analyze user journey and identify drop-off points',
    icon: Target,
  },
  {
    title: 'A/B Testing',
    description: 'Run experiments to optimize conversion rates',
    icon: TrendingUp,
  },
  {
    title: 'Announcements',
    description: 'Manage in-app announcements and feature promotions',
    icon: Megaphone,
  },
]

export default function SalesMarketingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Sales & Marketing</h1>
        <p className="text-muted-foreground">
          Marketing tools, analytics, and campaign management
        </p>
      </div>

      {/* Coming Soon Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>
                Marketing tools are under development and will be available soon
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Planned Features */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Planned Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {upcomingFeatures.map((feature) => (
            <Card key={feature.title} className="opacity-75">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-green-500 mb-2" />
                <CardTitle className="text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
