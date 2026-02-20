'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

interface DriftReportCardProps {
  report: {
    id: string
    periodStart: string
    periodEnd: string
    briScoreStart: number
    briScoreEnd: number
    valuationStart: number
    valuationEnd: number
    tasksCompletedCount: number
    signalsCount: number
    viewedAt: string | null
  }
  compact?: boolean
}

export function DriftReportCard({ report, compact = false }: DriftReportCardProps) {
  const briChange = report.briScoreEnd - report.briScoreStart
  const briChangePoints = Math.round(briChange * 100)
  const isPositive = briChange >= 0
  const isUnviewed = !report.viewedAt

  const monthLabel = new Date(report.periodStart).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  if (compact) {
    return (
      <Link href="/dashboard/drift-report">
        <Card className={`hover:border-primary/30 transition-colors cursor-pointer ${isUnviewed ? 'border-primary/40 bg-primary/5' : ''}`}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isPositive ? 'bg-green-light' : 'bg-red-light'}`}>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-dark" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-dark" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isUnviewed ? `Your ${monthLabel} drift report is ready` : `${monthLabel} Drift Report`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    BRI {isPositive ? '+' : ''}{briChangePoints} pts · {report.tasksCompletedCount} tasks completed
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  const valuationChange = report.valuationEnd - report.valuationStart
  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

  return (
    <Link href="/dashboard/drift-report">
      <Card className="hover:border-primary/30 transition-colors cursor-pointer">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">{monthLabel}</h3>
            {isUnviewed && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">New</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Buyer Readiness</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-lg font-bold">{Math.round(report.briScoreEnd * 100)}</span>
                <span className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-dark' : 'text-red-dark'}`}>
                  {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {isPositive ? '+' : ''}{briChangePoints}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valuation</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-lg font-bold">{formatCurrency(report.valuationEnd)}</span>
                <span className={`flex items-center text-xs font-medium ${valuationChange >= 0 ? 'text-green-dark' : 'text-red-dark'}`}>
                  {valuationChange >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {formatCurrency(Math.abs(valuationChange))}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <span>{report.tasksCompletedCount} tasks completed</span>
            <span>{report.signalsCount} signals</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
