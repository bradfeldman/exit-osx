'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StageTime {
  stage: string
  avgDays: number
  medianDays: number
  minDays: number
  maxDays: number
  sampleSize: number
  trend: 'up' | 'down' | 'stable'
}

interface TimeInStageChartProps {
  dealId: string
  className?: string
}

export function TimeInStageChart({ dealId, className }: TimeInStageChartProps) {
  const [stageData, setStageData] = useState<StageTime[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/deals/${dealId}/analytics/time-in-stage`)
        if (res.ok) {
          const data = await res.json()
          setStageData(data.stages || [])
        }
      } catch (error) {
        console.error('Error fetching time in stage data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [dealId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Time in Stage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (stageData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Time in Stage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Not enough data to show time in stage metrics
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxDays = Math.max(...stageData.map(s => s.avgDays))

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-red-500" />
      case 'down':
        return <TrendingDown className="h-3 w-3 text-green-500" />
      default:
        return <Minus className="h-3 w-3 text-gray-400" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Time in Stage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stageData.map((stage, index) => {
            const widthPercent = maxDays > 0 ? (stage.avgDays / maxDays) * 100 : 0

            return (
              <motion.div
                key={stage.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="space-y-1"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[150px]">{stage.stage}</span>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={stage.trend} />
                    <span className="font-bold">{stage.avgDays}d</span>
                  </div>
                </div>
                <div className="h-6 bg-muted rounded overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                    className={cn(
                      'h-full rounded',
                      stage.avgDays <= 7 ? 'bg-green-400' :
                      stage.avgDays <= 14 ? 'bg-blue-400' :
                      stage.avgDays <= 30 ? 'bg-amber-400' : 'bg-red-400'
                    )}
                  />
                  {/* Min/Max range indicator */}
                  {stage.minDays !== stage.maxDays && (
                    <div className="absolute inset-y-0 flex items-center text-[10px] text-muted-foreground right-2">
                      {stage.minDays}-{stage.maxDays}d range
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Median: {stage.medianDays}d</span>
                  <span>n={stage.sampleSize}</span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-400" />
            <span>≤7 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span>8-14 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-400" />
            <span>15-30 days</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span>&gt;30 days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
