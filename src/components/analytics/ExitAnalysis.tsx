'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  LogOut,
  XCircle,
  AlertTriangle,
  Ban,
  Clock,
  DollarSign,
} from 'lucide-react'

interface ExitReason {
  reason: string
  count: number
  percentage: number
  avgDaysInProcess: number
  stage: string
}

interface ExitAnalysisProps {
  dealId: string
  className?: string
}

// Exit reason icons and colors
const EXIT_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  PASSED: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-gray-600 bg-gray-100',
  },
  WITHDRAWN: {
    icon: <LogOut className="h-4 w-4" />,
    color: 'text-orange-600 bg-orange-100',
  },
  TERMINATED: {
    icon: <Ban className="h-4 w-4" />,
    color: 'text-red-600 bg-red-100',
  },
  DECLINED: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600 bg-amber-100',
  },
  IOI_DECLINED: {
    icon: <DollarSign className="h-4 w-4" />,
    color: 'text-purple-600 bg-purple-100',
  },
}

export function ExitAnalysis({ dealId, className }: ExitAnalysisProps) {
  const [exitData, setExitData] = useState<ExitReason[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalExits, setTotalExits] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/deals/${dealId}/analytics/exits`)
        if (res.ok) {
          const data = await res.json()
          setExitData(data.exits || [])
          setTotalExits(data.totalExits || 0)
        }
      } catch (error) {
        console.error('Error fetching exit analysis:', error)
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
          <CardTitle className="text-base">Exit Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (exitData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Exit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <LogOut className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No exits recorded yet
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Exit Analysis
          </div>
          <Badge variant="secondary">{totalExits} total exits</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {exitData.map((exit, index) => {
            const style = EXIT_STYLES[exit.reason] || EXIT_STYLES.PASSED

            return (
              <motion.div
                key={exit.reason}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', style.color)}>
                  {style.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {exit.reason.replace(/_/g, ' ')}
                    </span>
                    <Badge variant="outline">{exit.count}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{exit.percentage}% of exits</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Avg {exit.avgDaysInProcess}d in process
                    </span>
                  </div>
                  {exit.stage && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Most common exit point: {exit.stage.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Insights */}
        {exitData.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              <strong>Insight:</strong> Most buyers exit as &quot;{exitData[0]?.reason.replace(/_/g, ' ')}&quot;
              after an average of {exitData[0]?.avgDaysInProcess} days in the process.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
