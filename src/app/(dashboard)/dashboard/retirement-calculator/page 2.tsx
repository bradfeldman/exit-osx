'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RetirementCalculatorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retirement Calculator</h1>
        <p className="text-muted-foreground mt-2">
          Plan your retirement based on your business exit value
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            The Retirement Calculator will help you understand how your business exit can fund your retirement goals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is currently under development. Check back soon!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
