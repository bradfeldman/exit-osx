'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  TrendingDown,
  PieChart,
  LogOut,
  RefreshCw,
  Download,
} from 'lucide-react'

import { PipelineFunnel } from './PipelineFunnel'
import { TimeInStageChart } from './TimeInStageChart'
import { BuyerMixChart } from './BuyerMixChart'
import { ExitAnalysis } from './ExitAnalysis'

interface AnalyticsDashboardProps {
  dealId: string
  className?: string
}

type TabId = 'overview' | 'funnel' | 'timing' | 'exits'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'funnel', label: 'Pipeline', icon: <TrendingDown className="h-4 w-4" /> },
  { id: 'timing', label: 'Timing', icon: <PieChart className="h-4 w-4" /> },
  { id: 'exits', label: 'Exits', icon: <LogOut className="h-4 w-4" /> },
]

export function AnalyticsDashboard({ dealId, className }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deal Analytics</h2>
          <p className="text-muted-foreground">
            Pipeline insights and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b pb-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="gap-2"
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={`${activeTab}-${refreshKey}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PipelineFunnel dealId={dealId} />
            <BuyerMixChart dealId={dealId} />
            <TimeInStageChart dealId={dealId} className="lg:col-span-2" />
            <ExitAnalysis dealId={dealId} className="lg:col-span-2" />
          </div>
        )}

        {activeTab === 'funnel' && (
          <div className="space-y-6">
            <PipelineFunnel dealId={dealId} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funnel Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">Tip</Badge>
                    <p className="text-sm text-muted-foreground">
                      The funnel shows how buyers progress through the deal process.
                      Look for stages with high drop-off rates to identify bottlenecks.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">Benchmark</Badge>
                    <p className="text-sm text-muted-foreground">
                      Typical conversion from Teaser to NDA is 40-60%.
                      From NDA to IOI is typically 20-30%.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'timing' && (
          <div className="space-y-6">
            <TimeInStageChart dealId={dealId} />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timing Benchmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold">5-7d</p>
                    <p className="text-xs text-muted-foreground">Teaser Response</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold">7-14d</p>
                    <p className="text-xs text-muted-foreground">NDA Execution</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold">14-21d</p>
                    <p className="text-xs text-muted-foreground">CIM Review</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-2xl font-bold">30-45d</p>
                    <p className="text-xs text-muted-foreground">IOI Submission</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'exits' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExitAnalysis dealId={dealId} />
              <BuyerMixChart dealId={dealId} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Exit Analysis Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-1">PASSED</Badge>
                    <p className="text-sm text-muted-foreground">
                      Buyer reviewed materials but decided not to proceed.
                      Common after teaser or CIM review.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-1">WITHDRAWN</Badge>
                    <p className="text-sm text-muted-foreground">
                      Buyer withdrew from the process, often due to internal priorities
                      or competing transactions.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-1">TERMINATED</Badge>
                    <p className="text-sm text-muted-foreground">
                      Process terminated by seller, typically due to buyer behavior,
                      conflict, or strategic reasons.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-1">IOI DECLINED</Badge>
                    <p className="text-sm text-muted-foreground">
                      Buyer&apos;s indication of interest was declined by the seller,
                      usually due to valuation or terms.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  )
}
