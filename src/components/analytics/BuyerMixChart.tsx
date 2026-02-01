'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/lib/motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { PieChart, Building2, Briefcase, HelpCircle } from 'lucide-react'

interface BuyerMixData {
  type: string
  count: number
  percentage: number
  activeCount: number
}

interface BuyerMixChartProps {
  dealId: string
  className?: string
}

// Type colors
const TYPE_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Strategic: {
    bg: 'bg-blue-500',
    text: 'text-blue-600',
    icon: <Building2 className="h-4 w-4" />,
  },
  Financial: {
    bg: 'bg-purple-500',
    text: 'text-purple-600',
    icon: <Briefcase className="h-4 w-4" />,
  },
  'Hybrid / Other': {
    bg: 'bg-gray-500',
    text: 'text-gray-600',
    icon: <HelpCircle className="h-4 w-4" />,
  },
}

export function BuyerMixChart({ dealId, className }: BuyerMixChartProps) {
  const [mixData, setMixData] = useState<BuyerMixData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalBuyers, setTotalBuyers] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/deals/${dealId}/analytics/buyer-mix`)
        if (res.ok) {
          const data = await res.json()
          setMixData(data.mix || [])
          setTotalBuyers(data.totalBuyers || 0)
        }
      } catch (error) {
        console.error('Error fetching buyer mix data:', error)
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
          <CardTitle className="text-base">Buyer Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (mixData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">Buyer Mix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No buyer data available
          </p>
        </CardContent>
      </Card>
    )
  }

  // Calculate pie chart segments
  let cumulativePercent = 0
  const segments = mixData.map(item => {
    const start = cumulativePercent
    cumulativePercent += item.percentage
    return { ...item, start, end: cumulativePercent }
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="h-4 w-4" />
          Buyer Mix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut Chart */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {segments.map((segment, index) => {
                const colors = TYPE_COLORS[segment.type] || TYPE_COLORS['Hybrid / Other']
                const circumference = 2 * Math.PI * 40
                const offset = (segment.start / 100) * circumference
                const length = (segment.percentage / 100) * circumference

                return (
                  <motion.circle
                    key={segment.type}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    className={colors.bg}
                    strokeWidth="12"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                    stroke="currentColor"
                    initial={{ strokeDasharray: `0 ${circumference}` }}
                    animate={{ strokeDasharray: `${length} ${circumference - length}` }}
                    transition={{ delay: index * 0.2, duration: 0.5 }}
                  />
                )
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{totalBuyers}</span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            {mixData.map((item, index) => {
              const colors = TYPE_COLORS[item.type] || TYPE_COLORS['Hybrid / Other']

              return (
                <motion.div
                  key={item.type}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('w-3 h-3 rounded', colors.bg)} />
                    <div className={cn('flex items-center gap-1.5', colors.text)}>
                      {colors.icon}
                      <span className="text-sm font-medium text-foreground">{item.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.count}
                    </Badge>
                    <span className="text-sm font-medium w-10 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Active vs Total */}
        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
          {mixData.map(item => (
            <div key={item.type}>
              <p className="text-lg font-bold">
                {item.activeCount}/{item.count}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.type} Active
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
