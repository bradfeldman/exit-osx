'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_STATUS_COLORS,
  PROSPECT_BUYER_TYPE_LABELS,
  PROSPECT_BUYER_TYPE_COLORS,
} from '@/lib/deal-tracker/constants'
import { ProspectApprovalStatus, BuyerType } from '@prisma/client'
import { AddProspectModal } from './AddProspectModal'
import { CSVImportModal } from './CSVImportModal'
import { DenyProspectModal } from './DenyProspectModal'
import {
  Plus,
  Upload,
  Check,
  X,
  Trash2,
  Users,
  ArrowRight,
  MoreHorizontal,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 }
  }
} as const

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: { duration: 0.2 }
  }
} as const

interface BuyerProspect {
  id: string
  name: string
  domain: string | null
  website: string | null
  headquartersLocation: string | null
  buyerType: BuyerType
  relevanceDescription: string | null
  approvalStatus: ProspectApprovalStatus
  statusChangedAt: string | null
  denialReason: string | null
  createdAt: string
  buyers: Array<{
    id: string
    name: string
    currentStage: string
  }>
}

interface ProspectBuyerListProps {
  companyId: string
  onAddToPipeline?: (prospect: BuyerProspect) => void
}

export function ProspectBuyerList({ companyId, onAddToPipeline }: ProspectBuyerListProps) {
  const [prospects, setProspects] = useState<BuyerProspect[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProspectApprovalStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState({ approved: 0, denied: 0, undecided: 0 })

  // Modal states
  const [showAddProspect, setShowAddProspect] = useState(false)
  const [showImportCSV, setShowImportCSV] = useState(false)
  const [showDenyModal, setShowDenyModal] = useState(false)
  const [prospectToDeny, setProspectToDeny] = useState<BuyerProspect | null>(null)

  const fetchProspects = useCallback(async () => {
    if (!companyId) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('buyerType', typeFilter)

      const res = await fetch(`/api/companies/${companyId}/prospects?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setProspects(data.prospects || [])
        setSummary(data.summary || { approved: 0, denied: 0, undecided: 0 })
      }
    } catch (error) {
      console.error('Error fetching prospects:', error)
    } finally {
      setIsLoading(false)
    }
  }, [companyId, search, statusFilter, typeFilter])

  useEffect(() => {
    fetchProspects()
  }, [fetchProspects])

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [statusFilter, typeFilter, search])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(prospects.map(p => p.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleApprove = async (prospectId: string) => {
    try {
      const res = await fetch(`/api/companies/${companyId}/prospects/${prospectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: 'APPROVED' }),
      })
      if (res.ok) {
        fetchProspects()
      }
    } catch (error) {
      console.error('Error approving prospect:', error)
    }
  }

  const handleDeny = (prospect: BuyerProspect) => {
    setProspectToDeny(prospect)
    setShowDenyModal(true)
  }

  const handleDenyConfirm = async (reason: string) => {
    if (!prospectToDeny) return

    try {
      const res = await fetch(`/api/companies/${companyId}/prospects/${prospectToDeny.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalStatus: 'DENIED',
          denialReason: reason || null,
        }),
      })
      if (res.ok) {
        fetchProspects()
      }
    } catch (error) {
      console.error('Error denying prospect:', error)
    } finally {
      setShowDenyModal(false)
      setProspectToDeny(null)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return

    try {
      const res = await fetch(`/api/companies/${companyId}/prospects/bulk-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectIds: Array.from(selectedIds),
          approvalStatus: 'APPROVED',
        }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchProspects()
      }
    } catch (error) {
      console.error('Error bulk approving:', error)
    }
  }

  const handleBulkDeny = async () => {
    if (selectedIds.size === 0) return

    try {
      const res = await fetch(`/api/companies/${companyId}/prospects/bulk-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectIds: Array.from(selectedIds),
          approvalStatus: 'DENIED',
        }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchProspects()
      }
    } catch (error) {
      console.error('Error bulk denying:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} prospect(s)?`)) return

    try {
      const res = await fetch(`/api/companies/${companyId}/prospects`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectIds: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchProspects()
      }
    } catch (error) {
      console.error('Error bulk deleting:', error)
    }
  }

  const handleAddToPipeline = (prospect: BuyerProspect) => {
    if (onAddToPipeline) {
      onAddToPipeline(prospect)
    }
  }

  const totalCount = summary.approved + summary.denied + summary.undecided

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold font-display">Prospect Buyer List</h2>
          <p className="text-sm text-muted-foreground">
            Manage potential buyers and get seller approval before outreach
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportCSV(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowAddProspect(true)} className="shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="p-3 border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{summary.undecided}</p>
                <p className="text-xs text-muted-foreground">Undecided</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="p-3 border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{summary.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="p-3 border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">{summary.denied}</p>
                <p className="text-xs text-muted-foreground">Denied</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prospects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(PROSPECT_BUYER_TYPE_LABELS).map(([type, label]) => (
              <SelectItem key={type} value={type}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProspectApprovalStatus | 'all')}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1">
            All
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{totalCount}</span>
          </TabsTrigger>
          <TabsTrigger value="UNDECIDED" className="gap-1">
            Undecided
            <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">{summary.undecided}</span>
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="gap-1">
            Approved
            <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">{summary.approved}</span>
          </TabsTrigger>
          <TabsTrigger value="DENIED" className="gap-1">
            Denied
            <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full">{summary.denied}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-4 p-3 bg-primary/5 border border-primary/20 rounded-xl"
          >
            <span className="text-sm font-medium text-primary">
              {selectedIds.size} prospect{selectedIds.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleBulkApprove} className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/50">
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkDeny} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50">
                <X className="h-4 w-4 mr-1" />
                Deny
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkDelete} className="text-muted-foreground hover:text-foreground">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto"
            >
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : prospects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center h-64 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-muted mb-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No prospects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add potential buyers for seller review before outreach.
          </p>
          <Button onClick={() => setShowAddProspect(true)} className="shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Prospect
          </Button>
        </motion.div>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={selectedIds.size === prospects.length && prospects.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Why Relevant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="w-40 px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {prospects.map((prospect, index) => (
                    <ProspectRow
                      key={prospect.id}
                      prospect={prospect}
                      index={index}
                      isSelected={selectedIds.has(prospect.id)}
                      onSelect={(checked) => handleSelectOne(prospect.id, checked)}
                      onApprove={() => handleApprove(prospect.id)}
                      onDeny={() => handleDeny(prospect)}
                      onAddToPipeline={() => handleAddToPipeline(prospect)}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <AddProspectModal
        companyId={companyId}
        isOpen={showAddProspect}
        onClose={() => setShowAddProspect(false)}
        onCreated={() => {
          setShowAddProspect(false)
          fetchProspects()
        }}
      />

      <CSVImportModal
        companyId={companyId}
        isOpen={showImportCSV}
        onClose={() => setShowImportCSV(false)}
        onImported={() => {
          setShowImportCSV(false)
          fetchProspects()
        }}
      />

      <DenyProspectModal
        isOpen={showDenyModal}
        prospectName={prospectToDeny?.name || ''}
        onClose={() => {
          setShowDenyModal(false)
          setProspectToDeny(null)
        }}
        onConfirm={handleDenyConfirm}
      />
    </motion.div>
  )
}

// Prospect Row Component
interface ProspectRowProps {
  prospect: BuyerProspect
  index: number
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onApprove: () => void
  onDeny: () => void
  onAddToPipeline: () => void
}

function ProspectRow({
  prospect,
  index,
  isSelected,
  onSelect,
  onApprove,
  onDeny,
  onAddToPipeline,
}: ProspectRowProps) {
  const statusColors = PROSPECT_STATUS_COLORS[prospect.approvalStatus]
  const typeColors = PROSPECT_BUYER_TYPE_COLORS[prospect.buyerType] || PROSPECT_BUYER_TYPE_COLORS.OTHER
  const isInPipeline = prospect.buyers && prospect.buyers.length > 0

  return (
    <motion.tr
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
    >
      <td className="px-4 py-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
        />
      </td>
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-foreground">{prospect.name}</div>
          {prospect.domain && (
            <div className="text-xs text-muted-foreground">{prospect.domain}</div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${typeColors.bg} ${typeColors.text}`}>
          {PROSPECT_BUYER_TYPE_LABELS[prospect.buyerType] || prospect.buyerType}
        </span>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <p className="text-sm text-muted-foreground truncate">
          {prospect.relevanceDescription || '—'}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full w-fit ${statusColors.bg} ${statusColors.text}`}>
            {PROSPECT_STATUS_LABELS[prospect.approvalStatus]}
          </span>
          {prospect.statusChangedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(prospect.statusChangedAt).toLocaleDateString()}
            </span>
          )}
          {prospect.approvalStatus === 'DENIED' && prospect.denialReason && (
            <span className="text-xs text-red-500 truncate max-w-32" title={prospect.denialReason}>
              {prospect.denialReason}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {prospect.approvalStatus === 'UNDECIDED' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onApprove}
                title="Approve"
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/50"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDeny}
                title="Deny"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          {prospect.approvalStatus === 'APPROVED' && !isInPipeline && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddToPipeline}
              className="text-primary"
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Pipeline
            </Button>
          )}
          {isInPipeline && (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-950/50 px-2 py-1 rounded-full">
              In Pipeline
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {prospect.approvalStatus !== 'APPROVED' && (
                <DropdownMenuItem onClick={onApprove} className="text-green-600">
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
              )}
              {prospect.approvalStatus !== 'DENIED' && (
                <DropdownMenuItem onClick={onDeny} className="text-red-600">
                  <X className="h-4 w-4 mr-2" />
                  Deny
                </DropdownMenuItem>
              )}
              {prospect.approvalStatus === 'APPROVED' && !isInPipeline && (
                <DropdownMenuItem onClick={onAddToPipeline}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Add to Pipeline
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  )
}
