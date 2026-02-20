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
  'bg-primary/20 dark:bg-primary/20',
  'bg-primary/30 dark:bg-primary/30',
  'bg-primary/50 dark:bg-primary/40',
  'bg-primary/70 dark:bg-primary/50',
  'bg-primary dark:bg-primary/60',
  'bg-green dark:bg-green/60',
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
                  <span className="text-sm font-medium truncate text-foreground">
                    {stage.stage}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {stage.count}
                  </span>
                </div>
                {/* Dropoff indicator */}
                {index > 0 && stage.dropoffRate > 0 && (
                  <div className="absolute -top-1 right-0 text-[10px] text-red">
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
