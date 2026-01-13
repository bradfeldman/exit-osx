import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Value Snapshot</h1>
        <p className="text-gray-600">
          Welcome back{user?.user_metadata?.name ? `, ${user.user_metadata.name}` : ''}
        </p>
      </div>

      {/* Placeholder cards - will be replaced with real data */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Value</CardDescription>
            <CardTitle className="text-3xl">$0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Complete assessment to calculate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>BRI Score</CardDescription>
            <CardTitle className="text-3xl">--</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Buyer Readiness Index
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Value Gap</CardDescription>
            <CardTitle className="text-3xl">$0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Potential improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasks</CardDescription>
            <CardTitle className="text-3xl">0 / 0</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Completed / Total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started Card */}
      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>
            Complete these steps to calculate your business valuation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Set up your company</h3>
                <p className="text-sm text-gray-600">Add your company details and financial information</p>
              </div>
              <span className="text-sm text-gray-500">Coming soon</span>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Complete the BRI assessment</h3>
                <p className="text-sm text-gray-600">Answer questions about your business readiness</p>
              </div>
              <span className="text-sm text-gray-500">Coming soon</span>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 font-semibold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Review your playbook</h3>
                <p className="text-sm text-gray-600">See prioritized actions to increase your value</p>
              </div>
              <span className="text-sm text-gray-500">Coming soon</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
