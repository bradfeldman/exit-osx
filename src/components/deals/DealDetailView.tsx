'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DealBuyerPipeline } from './DealBuyerPipeline'
import { AddBuyerToDealModal } from './AddBuyerToDealModal'
import { DealStatus, ApprovalStatus } from '@prisma/client'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Plus,
  ArrowLeft,
  Building2,
  Calendar,
  Users,
  LayoutGrid,
  List,
  Settings,
  CheckCircle,
  Clock,
  XCircle,
  PauseCircle,
} from 'lucide-react'
import type { DealWithAnalytics, DealBuyer, DealBuyersResponse } from './types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 15 },
  },
}

const STATUS_CONFIG: Record<DealStatus, { label: string; icon: React.ElementType; colors: string }> = {
  ACTIVE: { label: 'Active', icon: CheckCircle, colors: 'text-green-600 bg-green-100' },
  CLOSED: { label: 'Closed', icon: CheckCircle, colors: 'text-blue-600 bg-blue-100' },
  ON_HOLD: { label: 'On Hold', icon: PauseCircle, colors: 'text-amber-600 bg-amber-100' },
  TERMINATED: { label: 'Terminated', icon: XCircle, colors: 'text-red-600 bg-red-100' },
}

interface DealDetailViewProps {
  dealId: string
}

export function DealDetailView({ dealId }: DealDetailViewProps) {
  const router = useRouter()
  const [deal, setDeal] = useState<DealWithAnalytics | null>(null)
  const [buyers, setBuyers] = useState<DealBuyer[]>([])
  const [_analytics, setAnalytics] = useState<DealBuyersResponse['analytics'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddBuyer, setShowAddBuyer] = useState(false)
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline')

  const fetchDeal = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}`)
      if (res.ok) {
        const data = await res.json()
        setDeal(data.deal)
      } else if (res.status === 404) {
        router.push('/dashboard/deals')
      }
    } catch (error) {
      console.error('Error fetching deal:', error)
    }
  }, [dealId, router])

  const fetchBuyers = useCallback(async () => {
    try {
      const res = await fetch(`/api/deals/${dealId}/buyers?limit=200`)
      if (res.ok) {
        const data: DealBuyersResponse = await res.json()
        setBuyers(data.buyers || [])
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching buyers:', error)
    }
  }, [dealId])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchDeal(), fetchBuyers()])
      setIsLoading(false)
    }
    loadData()
  }, [fetchDeal, fetchBuyers])

  const handleBuyerCreated = () => {
    setShowAddBuyer(false)
    fetchBuyers()
  }

  const handleBuyerUpdated = () => {
    fetchBuyers()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="mx-auto mb-4"
          >
            <Loader2 className="h-10 w-10 text-primary" />
          </motion.div>
          <p className="text-muted-foreground font-medium">Loading deal...</p>
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Deal not found</p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/dashboard/deals">Back to Deals</Link>
          </Button>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[deal.status]
  const StatusIcon = statusConfig.icon

  // Calculate approval stats
  const pendingApproval = buyers.filter((b) => b.approvalStatus === ApprovalStatus.PENDING).length
  const approvedBuyers = buyers.filter((b) => b.approvalStatus === ApprovalStatus.APPROVED).length

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Breadcrumb & Header */}
      <motion.div variants={itemVariants}>
        <Link
          href="/dashboard/deals"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Deals
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
                {deal.codeName}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
                  statusConfig.colors
                )}
              >
                <StatusIcon className="h-4 w-4" />
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {deal.company.name}
              </span>
              {deal.targetCloseDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Target: {formatDate(deal.targetCloseDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button onClick={() => setShowAddBuyer(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Buyer
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Buyers</span>
          </div>
          <p className="text-2xl font-bold">{buyers.length}</p>
        </div>
        <div className="bg-background border rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Approved</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{approvedBuyers}</p>
        </div>
        <div className="bg-background border rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Pending Approval</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pendingApproval}</p>
        </div>
        <div className="bg-background border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Created</span>
          </div>
          <p className="text-lg font-semibold">{formatDate(deal.createdAt)}</p>
        </div>
      </motion.div>

      {/* View Toggle */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Buyer Pipeline</h2>
        <Tabs value={view} onValueChange={(v) => setView(v as 'pipeline' | 'list')}>
          <TabsList>
            <TabsTrigger value="pipeline">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-1" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Pipeline/List View */}
      <motion.div variants={itemVariants}>
        {buyers.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl">
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-6 flex items-center justify-center">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Add Your First Buyer</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Start building your buyer pipeline by adding potential acquirers to this deal.
              </p>
              <Button onClick={() => setShowAddBuyer(true)} size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5 mr-2" />
                Add First Buyer
              </Button>
            </div>
          </div>
        ) : view === 'pipeline' ? (
          <DealBuyerPipeline
            buyers={buyers}
            dealId={dealId}
            onBuyerUpdated={handleBuyerUpdated}
          />
        ) : (
          <div className="bg-background border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Approval
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Contacts
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {buyers.map((buyer) => (
                  <tr key={buyer.id} className="border-b last:border-b-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/deals/${dealId}/buyers/${buyer.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {buyer.canonicalCompany.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{buyer.currentStage}</td>
                    <td className="px-4 py-3 text-sm">{buyer.approvalStatus}</td>
                    <td className="px-4 py-3 text-sm">{buyer.contacts.length}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(buyer.stageUpdatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add Buyer Modal */}
      <AddBuyerToDealModal
        dealId={dealId}
        dealCodeName={deal.codeName}
        isOpen={showAddBuyer}
        onClose={() => setShowAddBuyer(false)}
        onCreated={handleBuyerCreated}
      />
    </motion.div>
  )
}
