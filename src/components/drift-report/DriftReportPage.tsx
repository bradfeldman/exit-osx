'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AnimatedStagger, AnimatedItem } from '@/components/ui/animated-section'
import { DriftReportLoading } from './DriftReportLoading'
import { DriftReportCard } from './DriftReportCard'
import { TrendingUp, TrendingDown, Minus, Activity, CheckCircle, AlertTriangle } from 'lucide-react'

interface DriftCategory {
  category: string
  label: string
  scoreBefore: number
  scoreAfter: number
  direction: 'up' | 'down' | 'flat'
}

interface TopSignal {
  title: string
  severity: string
  category: string
  createdAt: string
}

interface DriftReport {
  id: string
  periodStart: string
  periodEnd: string
  briScoreStart: number
  briScoreEnd: number
  valuationStart: number
  valuationEnd: number
  signalsCount: number
  tasksCompletedCount: number
  tasksAddedCount: number
  driftCategories: DriftCategory[]
  topSignals: TopSignal[]
  summary: string
  emailSentAt: string | null
  viewedAt: string | null
  createdAt: string
}

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  CRITICAL: { color: 'text-red-700', bgColor: 'bg-red-100' },
  HIGH: { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  MEDIUM: { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  LOW: { color: 'text-blue-700', bgColor: 'bg-blue-100' },
  INFO: { color: 'text-gray-700', bgColor: 'bg-gray-100' },
}

export function DriftReportPage() {
  const { selectedCompanyId } = useCompany()
  const [reports, setReports] = useState<DriftReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    if (!selectedCompanyId) return
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${selectedCompanyId}/drift-reports?limit=12`)
      if (!response.ok) throw new Error('Failed to fetch drift reports')
      const data = await response.json()
      setReports(data.reports)

      // Mark the latest as viewed
      if (data.reports.length > 0 && !data.reports[0].viewedAt) {
        fetch(`/api/companies/${selectedCompanyId}/drift-reports/${data.reports[0].id}`, {
          method: 'PATCH',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drift reports')
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  if (loading) return <DriftReportLoading />

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Drift Report</h1>
          <p className="text-muted-foreground">Track how your exit readiness changes over time</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Drift Report</h1>
          <p className="text-muted-foreground">Track how your exit readiness changes over time</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Drift Reports Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your first monthly drift report will be generated at the beginning of next month.
              It will show how your BRI score, valuation, and exit readiness have changed.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const latest = reports[0]
  const previousReports = reports.slice(1)

  const briChange = latest.briScoreEnd - latest.briScoreStart
  const briChangePoints = Math.round(briChange * 100)
  const valuationChange = latest.valuationEnd - latest.valuationStart
  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  const monthLabel = new Date(latest.periodStart).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const categories = latest.driftCategories as DriftCategory[]
  const signals = latest.topSignals as TopSignal[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monthly Drift Report — {monthLabel}</h1>
        <p className="text-muted-foreground">{latest.summary}</p>
      </div>

      <AnimatedStagger>
        {/* Score Panel */}
        <AnimatedItem>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Buyer Readiness Score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold">{Math.round(latest.briScoreEnd * 100)}</span>
                  <div className={`flex items-center gap-1 mb-1 text-sm font-semibold ${briChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {briChange > 0.005 ? <TrendingUp className="h-4 w-4" /> : briChange < -0.005 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
                    {briChange >= 0 ? '+' : ''}{briChangePoints} pts
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>From {Math.round(latest.briScoreStart * 100)}</span>
                  <span>→</span>
                  <span>{Math.round(latest.briScoreEnd * 100)}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Estimated Valuation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold">{formatCurrency(latest.valuationEnd)}</span>
                  <div className={`flex items-center gap-1 mb-1 text-sm font-semibold ${valuationChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {valuationChange > 0 ? <TrendingUp className="h-4 w-4" /> : valuationChange < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
                    {valuationChange >= 0 ? '+' : '-'}{formatCurrency(Math.abs(valuationChange))}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    {latest.tasksCompletedCount} tasks completed
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    {latest.signalsCount} signals
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </AnimatedItem>

        {/* Category Breakdown */}
        <AnimatedItem>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category Breakdown</CardTitle>
              <CardDescription>BRI score changes by dimension</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categories.map(cat => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        cat.direction === 'up' ? 'bg-green-100' : cat.direction === 'down' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {cat.direction === 'up' ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        ) : cat.direction === 'down' ? (
                          <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-gray-400" />
                        )}
                      </div>
                      <span className="text-sm font-medium">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{cat.scoreBefore}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold">{cat.scoreAfter}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        cat.direction === 'up' ? 'text-green-700 bg-green-50' : cat.direction === 'down' ? 'text-red-700 bg-red-50' : 'text-gray-500 bg-gray-50'
                      }`}>
                        {cat.direction === 'up' ? '+' : cat.direction === 'down' ? '' : ''}{cat.scoreAfter - cat.scoreBefore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </AnimatedItem>

        {/* Signal Summary */}
        {signals.length > 0 && (
          <AnimatedItem>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Signals</CardTitle>
                <CardDescription>Notable changes detected this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {signals.map((signal, idx) => {
                    const config = SEVERITY_CONFIG[signal.severity] || SEVERITY_CONFIG.INFO
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}>
                            {signal.severity}
                          </span>
                          <span className="text-sm truncate">{signal.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {signal.category}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </AnimatedItem>
        )}

        {/* Previous Reports */}
        {previousReports.length > 0 && (
          <AnimatedItem>
            <div>
              <h2 className="text-lg font-semibold mb-3">Previous Reports</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {previousReports.map(report => (
                  <DriftReportCard key={report.id} report={report} />
                ))}
              </div>
            </div>
          </AnimatedItem>
        )}
      </AnimatedStagger>
    </div>
  )
}
