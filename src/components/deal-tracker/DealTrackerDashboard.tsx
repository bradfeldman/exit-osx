'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useCompany } from '@/contexts/CompanyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BuyerList } from './BuyerList'
import { BuyerPipeline } from './BuyerPipeline'
import { PipelineMetrics } from './PipelineMetrics'
import { AddBuyerModal } from './AddBuyerModal'
import { ProspectBuyerList } from './ProspectBuyerList'
import {
  BUYER_TYPE_LABELS,
  BUYER_TIER_LABELS,
  STAGE_LABELS,
} from '@/lib/deal-tracker/constants'
import { DealStage, BuyerType, BuyerTier, ProspectApprovalStatus } from '@prisma/client'
import { Loader2 } from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  }
}

interface ProspectiveBuyer {
  id: string
  name: string
  buyerType: BuyerType
  tier: BuyerTier
  currentStage: DealStage
  website: string | null
  industry: string | null
  location: string | null
  stageUpdatedAt: string
  ioiAmount: number | null
  loiAmount: number | null
  contacts: Array<{
    id: string
    email: string
    firstName: string
    lastName: string
    isPrimary: boolean
  }>
  _count: {
    documents: number
    meetings: number
    activities: number
  }
}

interface BuyerProspect {
  id: string
  name: string
  buyerType: BuyerType
  approvalStatus: ProspectApprovalStatus
  relevanceDescription: string | null
  website: string | null
  headquartersLocation: string | null
}

export function DealTrackerDashboard() {
  const { selectedCompanyId } = useCompany()
  const [buyers, setBuyers] = useState<ProspectiveBuyer[]>([])
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [showAddBuyer, setShowAddBuyer] = useState(false)
  const [selectedProspectForBuyer, setSelectedProspectForBuyer] = useState<BuyerProspect | null>(null)
  const [mainTab, setMainTab] = useState<'pipeline' | 'prospects'>('pipeline')
  const [view, setView] = useState<'list' | 'pipeline'>('pipeline')
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterTier, setFilterTier] = useState<string>('all')

  const fetchBuyers = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStage !== 'all') params.set('stage', filterStage)
      if (filterType !== 'all') params.set('type', filterType)
      if (filterTier !== 'all') params.set('tier', filterTier)

      const res = await fetch(
        `/api/companies/${selectedCompanyId}/deal-tracker?${params.toString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setBuyers(data.buyers || [])
        setStageCounts(data.stageCounts || {})
      }
    } catch (error) {
      console.error('Error fetching buyers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, search, filterStage, filterType, filterTier])

  useEffect(() => {
    fetchBuyers()
  }, [fetchBuyers])

  const handleBuyerCreated = () => {
    setShowAddBuyer(false)
    setSelectedProspectForBuyer(null)
    fetchBuyers()
  }

  const handleBuyerUpdated = () => {
    fetchBuyers()
  }

  const handleAddToPipeline = (prospect: BuyerProspect) => {
    setSelectedProspectForBuyer(prospect)
    setShowAddBuyer(true)
  }

  if (!selectedCompanyId) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center h-64"
      >
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <UsersIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Please select a company to view the deal tracker.</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Deal Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track prospective buyers through the M&A process
          </p>
        </div>
        {mainTab === 'pipeline' && (
          <Button onClick={() => setShowAddBuyer(true)} className="shadow-lg shadow-primary/20">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Buyer
          </Button>
        )}
      </motion.div>

      {/* Main Tabs: Pipeline vs Prospects */}
      <motion.div variants={itemVariants}>
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'pipeline' | 'prospects')}>
          <TabsList>
            <TabsTrigger value="pipeline">
              <KanbanIcon className="h-4 w-4 mr-1" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="prospects">
              <UsersIcon className="h-4 w-4 mr-1" />
              Prospect List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Prospects Tab Content */}
      {mainTab === 'prospects' && (
        <ProspectBuyerList
          companyId={selectedCompanyId}
          onAddToPipeline={handleAddToPipeline}
        />
      )}

      {/* Pipeline Tab Content */}
      {mainTab === 'pipeline' && (
        <>
          {/* Metrics */}
          <PipelineMetrics companyId={selectedCompanyId} />

          {/* Filters and View Toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search buyers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48"
              />
              <Select value={filterStage} onValueChange={setFilterStage}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(STAGE_LABELS).map(([stage, label]) => (
                    <SelectItem key={stage} value={stage}>
                      {label} {stageCounts[stage] ? `(${stageCounts[stage]})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(BUYER_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {Object.entries(BUYER_TIER_LABELS).map(([tier, label]) => (
                    <SelectItem key={tier} value={tier}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'pipeline')}>
              <TabsList>
                <TabsTrigger value="pipeline">
                  <KanbanIcon className="h-4 w-4 mr-1" />
                  Pipeline
                </TabsTrigger>
                <TabsTrigger value="list">
                  <ListIcon className="h-4 w-4 mr-1" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Content */}
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mx-auto mb-4"
                >
                  <Loader2 className="h-10 w-10 text-primary" />
                </motion.div>
                <p className="text-muted-foreground font-medium">Loading pipeline...</p>
              </div>
            </motion.div>
          ) : buyers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-64 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted mb-4 flex items-center justify-center">
                <UsersIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No buyers yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start tracking prospective buyers for your deal process.
              </p>
              <Button onClick={() => setShowAddBuyer(true)} className="shadow-lg shadow-primary/20">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Your First Buyer
              </Button>
            </motion.div>
          ) : view === 'pipeline' ? (
            <BuyerPipeline
              buyers={buyers}
              companyId={selectedCompanyId}
              onBuyerUpdated={handleBuyerUpdated}
            />
          ) : (
            <BuyerList
              buyers={buyers}
              companyId={selectedCompanyId}
              onBuyerUpdated={handleBuyerUpdated}
            />
          )}
        </>
      )}

      {/* Add Buyer Modal */}
      <AddBuyerModal
        companyId={selectedCompanyId}
        isOpen={showAddBuyer}
        onClose={() => {
          setShowAddBuyer(false)
          setSelectedProspectForBuyer(null)
        }}
        onCreated={handleBuyerCreated}
        preselectedProspect={selectedProspectForBuyer}
      />
    </motion.div>
  )
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  )
}

function KanbanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  )
}
