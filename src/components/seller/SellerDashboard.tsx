'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Building2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  TrendingUp,
  Calendar,
  Target,
  AlertCircle,
} from 'lucide-react'

interface SellerDealSummary {
  id: string
  codeName: string
  status: string
  startDate: string
  targetCloseDate: string | null
  stats: {
    totalBuyers: number
    pendingApproval: number
    approved: number
    denied: number
    onHold: number
    activeInProcess: number
    passedOrWithdrawn: number
  }
  stageBreakdown: Array<{
    stage: string
    count: number
  }>
}

interface SellerDashboardProps {
  dealId: string
  className?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export function SellerDashboard({ dealId, className }: SellerDashboardProps) {
  const [summary, setSummary] = useState<SellerDealSummary | null>(null)
  const [companyName, setCompanyName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/seller/${dealId}`)
        if (res.ok) {
          const data = await res.json()
          setSummary(data.deal)
          setCompanyName(data.companyName)
        }
      } catch (error) {
        console.error('Error fetching seller summary:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSummary()
  }, [dealId])

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">Unable to load deal summary</p>
      </div>
    )
  }

  const conversionRate = summary.stats.totalBuyers > 0
    ? Math.round((summary.stats.activeInProcess / summary.stats.totalBuyers) * 100)
    : 0

  const daysToClose = summary.targetCloseDate
    ? Math.ceil((new Date(summary.targetCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-6', className)}
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{summary.codeName}</h1>
                    <p className="text-muted-foreground">{companyName}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  className={cn(
                    'text-sm',
                    summary.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {summary.status}
                </Badge>
                {daysToClose !== null && daysToClose > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {daysToClose} days to target close
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.stats.totalBuyers}</p>
                  <p className="text-xs text-muted-foreground">Total Buyers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className={summary.stats.pendingApproval > 0 ? 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/10' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.stats.pendingApproval}</p>
                  <p className="text-xs text-muted-foreground">Awaiting Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.stats.activeInProcess}</p>
                  <p className="text-xs text-muted-foreground">Active in Process</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{conversionRate}%</p>
                  <p className="text-xs text-muted-foreground">Conversion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Approval Summary and Stage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Approval Summary */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Approval Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Approved</span>
                  </div>
                  <span className="font-medium">{summary.stats.approved}</span>
                </div>
                <Progress
                  value={(summary.stats.approved / Math.max(summary.stats.totalBuyers, 1)) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pause className="h-4 w-4 text-orange-600" />
                    <span className="text-sm">On Hold</span>
                  </div>
                  <span className="font-medium">{summary.stats.onHold}</span>
                </div>
                <Progress
                  value={(summary.stats.onHold / Math.max(summary.stats.totalBuyers, 1)) * 100}
                  className="h-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm">Denied</span>
                  </div>
                  <span className="font-medium">{summary.stats.denied}</span>
                </div>
                <Progress
                  value={(summary.stats.denied / Math.max(summary.stats.totalBuyers, 1)) * 100}
                  className="h-2"
                />
              </div>

              <div className="pt-2 border-t text-sm text-muted-foreground">
                {summary.stats.passedOrWithdrawn} buyers have passed or withdrawn
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stage Breakdown */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.stageBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No approved buyers in process yet
                </p>
              ) : (
                <div className="space-y-3">
                  {summary.stageBreakdown.map((stage) => (
                    <div key={stage.stage} className="flex items-center justify-between">
                      <span className="text-sm">{stage.stage}</span>
                      <Badge variant="secondary">{stage.count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Key Dates */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">{summary.startDate}</p>
                <p className="text-xs text-muted-foreground">Process Started</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <Target className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {summary.targetCloseDate || 'TBD'}
                </p>
                <p className="text-xs text-muted-foreground">Target Close</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
