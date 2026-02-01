'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from '@/lib/motion'
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
import { DealCard } from './DealCard'
import { AddDealModal } from './AddDealModal'
import { Loader2, Plus, Briefcase, Search } from 'lucide-react'
import type { Deal, DealListResponse } from './types'

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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'ON_HOLD', label: 'On Hold' },
]

export function DealDashboard() {
  const { selectedCompanyId, companies } = useCompany()
  const [deals, setDeals] = useState<Deal[]>([])
  const [summary, setSummary] = useState({ active: 0, closed: 0, terminated: 0, onHold: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDeal, setShowAddDeal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  const fetchDeals = useCallback(async () => {
    if (!selectedCompanyId) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('companyId', selectedCompanyId)
      if (search) params.set('search', search)
      if (filterStatus !== 'all') params.set('status', filterStatus)

      const res = await fetch(`/api/deals?${params.toString()}`)
      if (res.ok) {
        const data: DealListResponse = await res.json()
        setDeals(data.deals || [])
        setSummary(data.summary || { active: 0, closed: 0, terminated: 0, onHold: 0 })
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, search, filterStatus])

  useEffect(() => {
    fetchDeals()
  }, [fetchDeals])

  const handleDealCreated = () => {
    setShowAddDeal(false)
    fetchDeals()
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
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Please select a company to view deals.</p>
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
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">
            Deals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage deal processes for {selectedCompany?.name}
          </p>
        </div>
        <Button onClick={() => setShowAddDeal(true)} className="shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          New Deal
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">Active</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{summary.active}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Closed</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{summary.closed}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">On Hold</p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{summary.onHold}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">Terminated</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">{summary.terminated}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center h-64"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="mx-auto mb-4"
            >
              <Loader2 className="h-10 w-10 text-primary" />
            </motion.div>
            <p className="text-muted-foreground font-medium">Loading deals...</p>
          </div>
        </motion.div>
      ) : deals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-border rounded-2xl"
        >
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-6 flex items-center justify-center">
              <Briefcase className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {search || filterStatus !== 'all' ? 'No Deals Found' : 'Create Your First Deal'}
            </h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {search || filterStatus !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Start tracking your M&A deal process by creating a new deal.'}
            </p>
            {!search && filterStatus === 'all' && (
              <Button onClick={() => setShowAddDeal(true)} size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="h-5 w-5 mr-2" />
                Create First Deal
              </Button>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <motion.div key={deal.id} variants={itemVariants}>
              <DealCard deal={deal} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Deal Modal */}
      {selectedCompany && (
        <AddDealModal
          companyId={selectedCompanyId}
          companyName={selectedCompany.name}
          isOpen={showAddDeal}
          onClose={() => setShowAddDeal(false)}
          onCreated={handleDealCreated}
        />
      )}
    </motion.div>
  )
}
