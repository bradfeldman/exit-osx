'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Company {
  id: string
  name: string
  annualRevenue: string
  annualEbitda: string
  coreFactors: {
    revenueSizeCategory: string
    revenueModel: string
  } | null
  valuationSnapshots: Array<{
    currentValue: string
    briScore: string
    valueGap: string
  }>
}

interface DashboardContentProps {
  userName?: string
}

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // First sync the user
        await fetch('/api/user/sync', { method: 'POST' })

        // Then fetch companies
        const response = await fetch('/api/companies')
        if (!response.ok) throw new Error('Failed to fetch companies')

        const data = await response.json()
        setCompanies(data.companies || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  // No companies - show onboarding
  if (companies.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Exit OSx</h1>
          <p className="text-gray-600">
            {userName ? `Hi ${userName}! ` : ''}Let&apos;s get started by setting up your company.
          </p>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Set Up Your Company</CardTitle>
            <CardDescription>
              Add your company details to get your valuation and buyer readiness score.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/company/setup">
              <Button size="lg">
                Get Started
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What You&apos;ll Get</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900">Enterprise Valuation</h3>
                <p className="text-sm text-gray-600 mt-1">
                  See your business value based on industry multiples and your financial performance.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900">Buyer Readiness Index</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Understand how ready your business is for acquisition across 6 key categories.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-medium text-gray-900">Action Playbook</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Get prioritized tasks with dollar-value attribution to close your value gap.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Has companies - show dashboard
  const company = companies[0]
  const latestSnapshot = company.valuationSnapshots?.[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Value Snapshot</h1>
          <p className="text-gray-600">{company.name}</p>
        </div>
        <Link href={`/dashboard/company/${company.id}/edit`}>
          <Button variant="outline" size="sm">Edit Company</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Value</CardDescription>
            <CardTitle className="text-3xl">
              {latestSnapshot ? formatCurrency(latestSnapshot.currentValue) : '--'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {latestSnapshot ? 'Based on adjusted EBITDA' : 'Complete BRI assessment'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>BRI Score</CardDescription>
            <CardTitle className="text-3xl">
              {latestSnapshot ? `${(parseFloat(latestSnapshot.briScore) * 100).toFixed(0)}%` : '--'}
            </CardTitle>
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
            <CardTitle className="text-3xl">
              {latestSnapshot ? formatCurrency(latestSnapshot.valueGap) : '--'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Potential improvement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Annual EBITDA</CardDescription>
            <CardTitle className="text-3xl">
              {formatCurrency(company.annualEbitda)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Reported earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      {!latestSnapshot && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              Complete these steps to get your full valuation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg border border-green-200 bg-green-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white font-semibold">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-green-900">Company Setup Complete</h3>
                  <p className="text-sm text-green-700">Your company details have been saved</p>
                </div>
              </div>

              <Link href="/dashboard/assessment" className="block">
                <div className="flex items-center gap-4 p-4 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-semibold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900">Complete the BRI Assessment</h3>
                    <p className="text-sm text-blue-700">Answer questions about your business readiness</p>
                  </div>
                  <Button size="sm">Start</Button>
                </div>
              </Link>

              <div className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-gray-600 font-semibold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-600">Review Your Playbook</h3>
                  <p className="text-sm text-gray-500">See prioritized actions to increase your value</p>
                </div>
                <span className="text-sm text-gray-400">Locked</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
