'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { HeroMetrics } from './HeroMetrics'
import { ValueDrivers } from './ValueDrivers'
import { RiskBreakdown } from './RiskBreakdown'

interface DashboardData {
  company: {
    id: string
    name: string
    annualRevenue: number
    annualEbitda: number
    adjustedEbitda: number
  }
  tier1: {
    currentValue: number
    potentialValue: number
    valueGap: number
    briScore: number | null
    coreScore: number | null
    finalMultiple: number
    multipleRange: {
      low: number
      high: number
    }
    industryName: string
    isEstimated?: boolean
  } | null
  tier2: {
    adjustedEbitda: number
    isEbitdaEstimated: boolean
    multipleRange: {
      low: number
      high: number
      current: number | null
    }
  }
  tier3: {
    categories: Array<{
      key: string
      label: string
      score: number
    }>
    topConstraints: Array<{
      category: string
      score: number
    }>
  } | null
  tier4: {
    taskStats: {
      total: number
      pending: number
      inProgress: number
      completed: number
      recoverableValue: number
      atRisk: number
    }
    sprintProgress: {
      id: string
      name: string
      totalTasks: number
      completedTasks: number
      recoverableValue: number
    } | null
  }
  tier5: {
    valueTrend: Array<{ value: number; date: string }>
    briTrend: { direction: 'up' | 'down'; change: number } | null
    exitWindow: string | null
  }
  hasAssessment: boolean
}

interface DashboardContentProps {
  userName?: string
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const { selectedCompanyId, companies, setSelectedCompanyId, isLoading: companyLoading } = useCompany()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [noCompany, setNoCompany] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewMultiple, setPreviewMultiple] = useState<number | null>(null)

  useEffect(() => {
    async function loadData() {
      if (companyLoading) return

      setLoading(true)
      setError(null)

      try {
        // First sync the user
        await fetch('/api/user/sync', { method: 'POST' })

        if (!selectedCompanyId) {
          // No company selected - check if companies exist in context
          if (companies.length === 0) {
            setNoCompany(true)
            setLoading(false)
            return
          }
          // Auto-select the first company
          setSelectedCompanyId(companies[0].id)
          // The useEffect will re-run with the new selectedCompanyId
          return
        }

        // Fetch consolidated dashboard data
        const response = await fetch(`/api/companies/${selectedCompanyId}/dashboard`)
        if (!response.ok) throw new Error('Failed to fetch dashboard data')

        const data = await response.json()
        setDashboardData(data)
        setNoCompany(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [selectedCompanyId, companies, companyLoading, setSelectedCompanyId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
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

  // No company selected - show onboarding
  if (noCompany || !dashboardData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Exit OSx</h1>
          <p className="text-gray-600">
            {userName ? `Hi ${userName}! ` : ''}Let&apos;s get started by setting up your company.
          </p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
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
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  const { tier1, tier2, tier3, hasAssessment } = dashboardData

  // Default empty categories for when no assessment exists
  const emptyCategories = [
    { key: 'FINANCIAL', label: 'Financial', score: 0 },
    { key: 'TRANSFERABILITY', label: 'Transferability', score: 0 },
    { key: 'OPERATIONAL', label: 'Operations', score: 0 },
    { key: 'MARKET', label: 'Market', score: 0 },
    { key: 'LEGAL_TAX', label: 'Legal/Tax', score: 0 },
    { key: 'PERSONAL', label: 'Personal', score: 0 },
  ]

  // Calculate preview values when dragging the multiple slider
  const isPreviewMode = previewMultiple !== null

  // baseMultiple is the max achievable multiple based on Core Score (used for potential value)
  const baseMultiple = tier1 && tier2.adjustedEbitda > 0
    ? tier1.potentialValue / tier2.adjustedEbitda
    : tier2.multipleRange.high

  const previewCurrentValue = isPreviewMode && tier1
    ? tier2.adjustedEbitda * previewMultiple
    : tier1?.currentValue ?? 0
  const previewValueGap = isPreviewMode && tier1
    ? tier1.potentialValue - previewCurrentValue
    : tier1?.valueGap ?? 0

  // Check if preview exceeds the achievable potential (based on Core Score)
  const isAbovePotential = isPreviewMode && previewMultiple > baseMultiple

  // Show the full dashboard (with assessment prompt if needed)
  return (
    <div className="max-w-5xl mx-auto">

      {/* Main Dashboard Card */}
      <Card className="overflow-hidden">
        <CardContent className="pt-4 md:pt-6 px-8 md:px-12 pb-8 md:pb-12">
          {/* Tier 1: Hero Metrics */}
          {tier1 && (
            <HeroMetrics
              currentValue={isPreviewMode ? previewCurrentValue : tier1.currentValue}
              potentialValue={tier1.potentialValue}
              valueGap={isPreviewMode ? previewValueGap : tier1.valueGap}
              briScore={tier1.briScore}
              coreScore={tier1.coreScore}
              personalReadinessScore={tier3?.categories.find(c => c.key === 'PERSONAL')?.score ?? null}
              isEstimated={tier1.isEstimated}
              isPreviewMode={isPreviewMode}
              isAbovePotential={isAbovePotential}
            />
          )}

          {/* Tier 2: Value Drivers */}
          <ValueDrivers
            adjustedEbitda={tier2.adjustedEbitda}
            isEbitdaEstimated={tier2.isEbitdaEstimated}
            multipleRange={tier2.multipleRange}
            industryName={tier1?.industryName || 'General Industry'}
            onMultipleDragChange={setPreviewMultiple}
            onMultipleDragEnd={() => setPreviewMultiple(null)}
          />

          {/* Tier 3: Risk Breakdown */}
          <RiskBreakdown
            categories={tier3?.categories || emptyCategories}
            topConstraints={tier3?.topConstraints || []}
            hasAssessment={hasAssessment}
          />
        </CardContent>
      </Card>
    </div>
  )
}
