'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendingDown, Users } from 'lucide-react'

interface FunnelStage {
  stage: string
  count: number
  percentage: number
  dropoffRate: number
}

interface PipelineFunnelProps {
  dealId: string
  className?: string
}

// Funnel colors from light to dark
const FUNNEL_COLORS = [
  'bg-blue-200 dark:bg-blue-900/50',
  'bg-blue-300 dark:bg-blue-800/50',
  'bg-blue-400 dark:bg-blue-700/50',
  'bg-blue-500 dark:bg-blue-600/50',
  'bg-blue-600 dark:bg-blue-500/50',
  'bg-green-500 dark:bg-green-600/50',
]

export function PipelineFunnel({ dealId, className }: PipelineFunnelProps) {
  const [stages, setStages] = useState<FunnelStage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalBuyers, setTotalBuyers] = useState(0)

  useEffect(() => {
    const fetchFunnel = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/deals/${dealId}/analytics/funnel`)
        if (res.ok) {
          const data = await res.json()
          setStages(data.stages || [])
          setTotalBuyers(data.totalBuyers || 0)
        }
      } catch (error) {
        console.error('Error fetching funnel data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFunnel()
  }, [dealId])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" style={{ width: `${100 - i * 10}%` }} />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (stages.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No funnel data available yet
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...stages.map(s => s.count))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Pipeline Funnel
          </div>
          <div className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <Users className="h-4 w-4" />
            {totalBuyers} total
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stages.map((stage, index) => {
            const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            const colorIndex = Math.min(index, FUNNEL_COLORS.length - 1)

            return (
              <motion.div
                key={stage.stage}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="relative"
                style={{ originX: 0 }}
              >
                <div
                  className={cn(
                    'h-10 rounded-r-lg flex items-center justify-between px-3 transition-all',
                    FUNNEL_COLORS[colorIndex]
                  )}
                  style={{ width: `${Math.max(widthPercent, 30)}%` }}
                >
                  <span className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">
                    {stage.stage}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {stage.count}
                  </span>
                </div>
                {/* Dropoff indicator */}
                {index > 0 && stage.dropoffRate > 0 && (
                  <div className="absolute -top-1 right-0 text-[10px] text-red-500">
                    -{stage.dropoffRate}%
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold">
              {stages.length > 0 ? stages[stages.length - 1].count : 0}
            </p>
            <p className="text-xs text-muted-foreground">At Final Stage</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {totalBuyers > 0
                ? Math.round((stages[stages.length - 1]?.count || 0) / totalBuyers * 100)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Overall Conversion</p>
          </div>
          <div>
            <p className="text-lg font-bold">
              {stages.length > 0
                ? Math.round(stages.reduce((sum, s) => sum + s.dropoffRate, 0) / stages.length)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Drop-off</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
