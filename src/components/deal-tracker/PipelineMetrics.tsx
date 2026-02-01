'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Loader2
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
} as const

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
} as const

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
  dealId: string
}

// Animated number component
function AnimatedNumber({ value, format = 'number' }: { value: number; format?: 'number' | 'currency' | 'percent' }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1200
    const startTime = Date.now()
    const startValue = displayValue
    let animationId: number

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (value - startValue) * easeProgress

      setDisplayValue(currentValue)

      if (progress < 1) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (format === 'currency') {
    const val = Math.round(displayValue)
    if (val >= 1_000_000) {
      return <>{`$${(val / 1_000_000).toFixed(1)}M`}</>
    }
    if (val >= 1_000) {
      return <>{`$${(val / 1_000).toFixed(0)}K`}</>
    }
    return <>{`$${val.toFixed(0)}`}</>
  }

  if (format === 'percent') {
    return <>{displayValue.toFixed(1)}%</>
  }

  return <>{Math.round(displayValue)}</>
}

export function PipelineMetrics({ dealId }: PipelineMetricsProps) {
  const [summary, setSummary] = useState<PipelineSummary | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    if (!dealId) return

    setIsLoading(true)
    try {
      // Use new contact system analytics endpoint
      const res = await fetch(`/api/deals/${dealId}/analytics/funnel`)
      if (res.ok) {
        const data = await res.json()
        // Transform funnel data to expected format
        const stageMapping: Record<string, keyof PipelineSummary['pipeline']> = {
          'Identified': 'identification',
          'Approved': 'identification',
          'Teaser Sent': 'marketing',
          'NDA Executed': 'nda',
          'CIM Access': 'diligence',
          'Management Meeting Completed': 'diligence',
          'IOI Received': 'ioi',
          'LOI Received': 'loi',
          'Due Diligence': 'close',
          'Closed': 'close',
        }

        const pipeline: PipelineSummary['pipeline'] = {
          identification: 0,
          marketing: 0,
          nda: 0,
          diligence: 0,
          ioi: 0,
          loi: 0,
          close: 0,
        }

        // Map stages from funnel data
        if (data.stages) {
          for (const stage of data.stages) {
            const key = stageMapping[stage.stage]
            if (key) {
              pipeline[key] = Math.max(pipeline[key], stage.count)
            }
          }
        }

        setSummary({
          pipeline,
          totalActive: data.totalBuyers || 0,
          upcomingDeadlines: [],
          staleBuyers: [],
        })

        setMetrics({
          totalBuyers: data.totalBuyers || 0,
          activeBuyers: data.totalBuyers || 0,
          terminatedBuyers: 0,
          closedDeals: pipeline.close,
          conversionRates: {
            teaserToInterested: 0,
            interestedToNda: 0,
            ndaToIoi: 0,
            ioiToLoi: 0,
            loiToClose: 0,
            overallClose: data.totalBuyers > 0 ? (pipeline.close / data.totalBuyers) * 100 : 0,
          },
          ioiLoiValues: {
            totalIoiValue: 0,
            avgIoiValue: 0,
            totalLoiValue: 0,
            avgLoiValue: 0,
            highestIoi: 0,
            highestLoi: 0,
          },
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dealId])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
              </div>
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={cardVariants} whileHover={{ scale: 1.02 }}>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Buyers</p>
                  <p className="text-3xl font-bold font-display text-foreground mt-1">
                    <AnimatedNumber value={metrics.activeBuyers} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    of {metrics.totalBuyers} total
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover={{ scale: 1.02 }}>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Diligence+</p>
                  <p className="text-3xl font-bold font-display text-foreground mt-1">
                    <AnimatedNumber value={summary.pipeline.diligence + summary.pipeline.ioi + summary.pipeline.loi + summary.pipeline.close} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    past NDA stage
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover={{ scale: 1.02 }}>
          <Card className="border-border/50 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">IOI/LOI Value</p>
                  <p className="text-3xl font-bold font-display text-green-600 dark:text-green-400 mt-1">
                    <AnimatedNumber
                      value={metrics.ioiLoiValues.totalLoiValue || metrics.ioiLoiValues.totalIoiValue}
                      format="currency"
                    />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    highest: <AnimatedNumber value={metrics.ioiLoiValues.highestLoi || metrics.ioiLoiValues.highestIoi} format="currency" />
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} whileHover={{ scale: 1.02 }}>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Closed Deals</p>
                  <p className="text-3xl font-bold font-display text-foreground mt-1">
                    <AnimatedNumber value={metrics.closedDeals} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <AnimatedNumber value={metrics.conversionRates.overallClose} format="percent" /> close rate
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Funnel Progress */}
      <motion.div variants={cardVariants}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {[
                { label: 'ID', value: summary.pipeline.identification, color: 'bg-slate-500' },
                { label: 'Mkt', value: summary.pipeline.marketing, color: 'bg-blue-500' },
                { label: 'NDA', value: summary.pipeline.nda, color: 'bg-indigo-500' },
                { label: 'DD', value: summary.pipeline.diligence, color: 'bg-purple-500' },
                { label: 'IOI', value: summary.pipeline.ioi, color: 'bg-pink-500' },
                { label: 'LOI', value: summary.pipeline.loi, color: 'bg-amber-500' },
                { label: 'Close', value: summary.pipeline.close, color: 'bg-green-500' },
              ].map((stage, idx) => {
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
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, 5)}%` }}
                      transition={{ delay: idx * 0.1, duration: 0.8, ease: "easeOut" }}
                      className={`w-full ${stage.color} rounded-t-lg relative min-h-[4px]`}
                    >
                      {stage.value > 0 && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.1 + 0.5 }}
                          className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-foreground"
                        >
                          {stage.value}
                        </motion.span>
                      )}
                    </motion.div>
                    <span className="text-[10px] text-muted-foreground font-medium">{stage.label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts */}
      {(summary.upcomingDeadlines.length > 0 || summary.staleBuyers.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          {summary.upcomingDeadlines.length > 0 && (
            <motion.div variants={cardVariants}>
              <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                      Upcoming Deadlines
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {summary.upcomingDeadlines.slice(0, 3).map((item) => (
                      <li
                        key={item.id}
                        className="text-sm text-amber-600 dark:text-amber-400 flex items-center justify-between bg-white/50 dark:bg-black/20 rounded-lg p-2"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="text-xs bg-amber-200/50 dark:bg-amber-800/50 px-2 py-0.5 rounded-full">
                          {item.type} - {new Date(item.deadline).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {summary.staleBuyers.length > 0 && (
            <motion.div variants={cardVariants}>
              <Card className="border-red-200/50 dark:border-red-800/30 bg-gradient-to-br from-red-50/50 to-pink-50/30 dark:from-red-950/20 dark:to-pink-950/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                      Stale Buyers (14+ days)
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {summary.staleBuyers.slice(0, 3).map((item) => (
                      <li
                        key={item.id}
                        className="text-sm text-red-600 dark:text-red-400 flex items-center justify-between bg-white/50 dark:bg-black/20 rounded-lg p-2"
                      >
                        <span className="truncate">{item.name}</span>
                        <span className="text-xs bg-red-200/50 dark:bg-red-800/50 px-2 py-0.5 rounded-full">
                          {item.daysSinceUpdate}d ago
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  )
}
