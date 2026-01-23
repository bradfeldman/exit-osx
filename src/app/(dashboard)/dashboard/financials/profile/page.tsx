'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompany } from '@/contexts/CompanyContext'
import { PeriodSelector, FinancialPeriod } from '@/components/financials'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Droplets,
  Scale,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FinancialMetric {
  label: string
  value: number | null
  unit: 'percent' | 'ratio' | 'days' | 'times'
  benchmark?: { low: number; high: number }
  description: string
  trend?: number // YoY change
}

interface MetricCategory {
  name: string
  icon: React.ReactNode
  color: string
  metrics: FinancialMetric[]
}

function getHealthStatus(value: number | null, benchmark?: { low: number; high: number }): 'good' | 'warning' | 'poor' | 'unknown' {
  if (value === null || !benchmark) return 'unknown'
  if (value >= benchmark.high) return 'good'
  if (value >= benchmark.low) return 'warning'
  return 'poor'
}

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return '-'
  switch (unit) {
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'ratio':
      return value.toFixed(2)
    case 'days':
      return `${Math.round(value)} days`
    case 'times':
      return `${value.toFixed(1)}x`
    default:
      return value.toString()
  }
}

function MetricCard({ metric }: { metric: FinancialMetric }) {
  const status = getHealthStatus(metric.value, metric.benchmark)

  const statusColors = {
    good: 'text-emerald-600 bg-emerald-50',
    warning: 'text-amber-600 bg-amber-50',
    poor: 'text-red-600 bg-red-50',
    unknown: 'text-gray-500 bg-gray-50',
  }

  const statusIcons = {
    good: <CheckCircle2 className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    poor: <AlertTriangle className="h-4 w-4" />,
    unknown: <Info className="h-4 w-4" />,
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{metric.label}</span>
        <div className={cn('p-1 rounded-full', statusColors[status])}>
          {statusIcons[status]}
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {formatMetricValue(metric.value, metric.unit)}
        </span>
        {metric.trend !== undefined && metric.trend !== 0 && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            metric.trend > 0 ? 'text-emerald-600' : 'text-red-600'
          )}>
            {metric.trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{metric.trend > 0 ? '+' : ''}{metric.trend.toFixed(1)}%</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">{metric.description}</p>
      {metric.benchmark && (
        <div className="mt-2 pt-2 border-t">
          <span className="text-xs text-gray-400">
            Target: {formatMetricValue(metric.benchmark.low, metric.unit)} - {formatMetricValue(metric.benchmark.high, metric.unit)}
          </span>
        </div>
      )}
    </div>
  )
}

function HealthScoreCard({ score, label }: { score: number | null; label: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'from-emerald-500 to-teal-500'
    if (s >= 60) return 'from-yellow-500 to-amber-500'
    return 'from-red-500 to-orange-500'
  }

  return (
    <Card className="overflow-hidden">
      <div className={cn(
        'bg-gradient-to-r p-6',
        score !== null ? getScoreColor(score) : 'from-gray-400 to-gray-500'
      )}>
        <div className="flex items-center justify-between">
          <div className="text-white">
            <p className="text-sm font-medium opacity-90">{label}</p>
            <p className="text-4xl font-bold">
              {score !== null ? `${Math.round(score)}` : '-'}
            </p>
            <p className="text-sm opacity-75">out of 100</p>
          </div>
          <div className="p-4 rounded-full bg-white/20">
            <Activity className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function FinancialProfilePage() {
  const { selectedCompanyId } = useCompany()
  const [selectedPeriod, setSelectedPeriod] = useState<FinancialPeriod | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [profileData, setProfileData] = useState<{
    healthScore: number | null
    categories: MetricCategory[]
  } | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!selectedCompanyId || !selectedPeriod) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/financial-profile?periodId=${selectedPeriod.id}`
      )
      if (response.ok) {
        const data = await response.json()
        setProfileData(data)
      } else {
        // Set default empty state if no data
        setProfileData({
          healthScore: null,
          categories: getDefaultCategories(),
        })
      }
    } catch (error) {
      console.error('Failed to fetch financial profile:', error)
      setProfileData({
        healthScore: null,
        categories: getDefaultCategories(),
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, selectedPeriod])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  function getDefaultCategories(): MetricCategory[] {
    return [
      {
        name: 'Profitability',
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'text-emerald-600',
        metrics: [
          { label: 'Gross Margin', value: null, unit: 'percent', benchmark: { low: 30, high: 50 }, description: 'Revenue retained after direct costs' },
          { label: 'EBITDA Margin', value: null, unit: 'percent', benchmark: { low: 10, high: 25 }, description: 'Operating profitability before D&A' },
          { label: 'Net Margin', value: null, unit: 'percent', benchmark: { low: 5, high: 15 }, description: 'Bottom-line profitability' },
        ],
      },
      {
        name: 'Liquidity',
        icon: <Droplets className="h-5 w-5" />,
        color: 'text-blue-600',
        metrics: [
          { label: 'Current Ratio', value: null, unit: 'ratio', benchmark: { low: 1.2, high: 2.0 }, description: 'Ability to pay short-term obligations' },
          { label: 'Quick Ratio', value: null, unit: 'ratio', benchmark: { low: 0.8, high: 1.5 }, description: 'Liquid assets vs current liabilities' },
          { label: 'Cash Ratio', value: null, unit: 'ratio', benchmark: { low: 0.2, high: 0.5 }, description: 'Cash-only coverage of liabilities' },
        ],
      },
      {
        name: 'Leverage',
        icon: <Scale className="h-5 w-5" />,
        color: 'text-purple-600',
        metrics: [
          { label: 'Debt-to-Equity', value: null, unit: 'ratio', benchmark: { low: 0, high: 1.5 }, description: 'Total debt relative to equity' },
          { label: 'Interest Coverage', value: null, unit: 'times', benchmark: { low: 3, high: 10 }, description: 'Ability to service debt interest' },
          { label: 'Debt-to-EBITDA', value: null, unit: 'times', benchmark: { low: 0, high: 3 }, description: 'Debt relative to cash flow' },
        ],
      },
      {
        name: 'Efficiency',
        icon: <Zap className="h-5 w-5" />,
        color: 'text-orange-600',
        metrics: [
          { label: 'DSO', value: null, unit: 'days', benchmark: { low: 30, high: 45 }, description: 'Days to collect receivables' },
          { label: 'DPO', value: null, unit: 'days', benchmark: { low: 30, high: 60 }, description: 'Days to pay suppliers' },
          { label: 'Asset Turnover', value: null, unit: 'times', benchmark: { low: 0.5, high: 2.0 }, description: 'Revenue per dollar of assets' },
        ],
      },
    ]
  }

  if (!selectedCompanyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Profile</h1>
          <p className="text-gray-600">Select a company to view financial health metrics</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No company selected. Please select a company from the dropdown above.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Profile</h1>
        <p className="text-gray-600">
          Comprehensive view of financial health metrics and trends
        </p>
      </div>

      {/* Period Selector */}
      <PeriodSelector
        companyId={selectedCompanyId}
        selectedPeriodId={selectedPeriod?.id || null}
        onPeriodChange={setSelectedPeriod}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !selectedPeriod ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Fiscal Year</h3>
              <p className="text-gray-500">
                Choose a fiscal year above to view your financial profile
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Health Score */}
          <HealthScoreCard
            score={profileData?.healthScore || null}
            label="Financial Health Score"
          />

          {/* Info Banner */}
          {profileData?.healthScore === null && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <p className="text-sm text-blue-700">
                Enter financial data in the <strong>Statements</strong> page to see your financial profile metrics.
              </p>
            </div>
          )}

          {/* Metric Categories */}
          {(profileData?.categories || getDefaultCategories()).map((category) => (
            <Card key={category.name}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg bg-gray-100', category.color)}>
                    {category.icon}
                  </div>
                  <span>{category.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {category.metrics.map((metric) => (
                    <MetricCard key={metric.label} metric={metric} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
