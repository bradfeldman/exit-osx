'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface PipelineSummary {
  pipeline: {
    identification: number
    marketing: number
    nda: number
    diligence: number
    ioi: number
    loi: number
    close: number
  }
  totalActive: number
  upcomingDeadlines: Array<{
    id: string
    name: string
    deadline: string
    type: 'IOI' | 'LOI'
  }>
  staleBuyers: Array<{
    id: string
    name: string
    daysSinceUpdate: number
  }>
}

interface Metrics {
  totalBuyers: number
  activeBuyers: number
  terminatedBuyers: number
  closedDeals: number
  conversionRates: {
    teaserToInterested: number
    interestedToNda: number
    ndaToIoi: number
    ioiToLoi: number
    loiToClose: number
    overallClose: number
  }
  ioiLoiValues: {
    totalIoiValue: number
    avgIoiValue: number
    totalLoiValue: number
    avgLoiValue: number
    highestIoi: number
    highestLoi: number
  }
}

interface PipelineMetricsProps {
  companyId: string
}

export function PipelineMetrics({ companyId }: PipelineMetricsProps) {
  const [summary, setSummary] = useState<PipelineSummary | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/companies/${companyId}/deal-tracker/analytics`)
      if (res.ok) {
        const data = await res.json()
        setSummary(data.summary)
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-12 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!summary || !metrics) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Active Buyers</p>
            <p className="text-2xl font-semibold">{metrics.activeBuyers}</p>
            <p className="text-xs text-muted-foreground mt-1">
              of {metrics.totalBuyers} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">In Diligence+</p>
            <p className="text-2xl font-semibold">
              {summary.pipeline.diligence + summary.pipeline.ioi + summary.pipeline.loi + summary.pipeline.close}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              past NDA stage
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">IOI/LOI Value</p>
            <p className="text-2xl font-semibold">
              {formatCurrency(metrics.ioiLoiValues.totalLoiValue || metrics.ioiLoiValues.totalIoiValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              highest: {formatCurrency(metrics.ioiLoiValues.highestLoi || metrics.ioiLoiValues.highestIoi)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Closed Deals</p>
            <p className="text-2xl font-semibold">{metrics.closedDeals}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.conversionRates.overallClose.toFixed(1)}% close rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Progress */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">Pipeline Funnel</p>
          <div className="flex items-end gap-1 h-16">
            {[
              { label: 'ID', value: summary.pipeline.identification },
              { label: 'Mkt', value: summary.pipeline.marketing },
              { label: 'NDA', value: summary.pipeline.nda },
              { label: 'DD', value: summary.pipeline.diligence },
              { label: 'IOI', value: summary.pipeline.ioi },
              { label: 'LOI', value: summary.pipeline.loi },
              { label: 'Close', value: summary.pipeline.close },
            ].map((stage) => {
              const maxValue = Math.max(
                summary.pipeline.identification,
                summary.pipeline.marketing,
                summary.pipeline.nda,
                summary.pipeline.diligence,
                summary.pipeline.ioi,
                summary.pipeline.loi,
                summary.pipeline.close,
                1
              )
              const height = maxValue > 0 ? (stage.value / maxValue) * 100 : 0

              return (
                <div key={stage.label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary/20 rounded-t relative transition-all"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary rounded-t transition-all"
                      style={{ height: `${height}%` }}
                    />
                    {stage.value > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground">
                        {stage.value}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{stage.label}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {(summary.upcomingDeadlines.length > 0 || summary.staleBuyers.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {summary.upcomingDeadlines.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                  Upcoming Deadlines
                </p>
                <ul className="space-y-1">
                  {summary.upcomingDeadlines.slice(0, 3).map((item) => (
                    <li key={item.id} className="text-sm text-amber-600 dark:text-amber-500">
                      {item.name} - {item.type} due {new Date(item.deadline).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {summary.staleBuyers.length > 0 && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                  Stale Buyers (14+ days)
                </p>
                <ul className="space-y-1">
                  {summary.staleBuyers.slice(0, 3).map((item) => (
                    <li key={item.id} className="text-sm text-red-600 dark:text-red-500">
                      {item.name} - {item.daysSinceUpdate} days since update
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
