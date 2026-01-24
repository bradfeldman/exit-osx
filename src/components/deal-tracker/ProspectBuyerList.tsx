'use client'

import { useState, useEffect, useCallback } from 'react'
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Prospect Buyer List</h2>
          <p className="text-sm text-muted-foreground">
            Manage potential buyers and get seller approval before outreach
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportCSV(true)}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowAddProspect(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Input
          placeholder="Search prospects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
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
          <TabsTrigger value="all">
            All ({totalCount})
          </TabsTrigger>
          <TabsTrigger value="UNDECIDED">
            Undecided ({summary.undecided})
          </TabsTrigger>
          <TabsTrigger value="APPROVED">
            Approved ({summary.approved})
          </TabsTrigger>
          <TabsTrigger value="DENIED">
            Denied ({summary.denied})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.size} prospect{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkApprove}>
              <CheckIcon className="h-4 w-4 mr-1" />
              Approve All
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDeny}>
              <XIcon className="h-4 w-4 mr-1" />
              Deny All
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDelete}>
              <TrashIcon className="h-4 w-4 mr-1" />
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
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : prospects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <UsersIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No prospects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add potential buyers for seller review before outreach.
          </p>
          <Button onClick={() => setShowAddProspect(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Your First Prospect
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={selectedIds.size === prospects.length && prospects.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">Company</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Why Relevant</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="w-32 px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {prospects.map((prospect) => (
                <ProspectRow
                  key={prospect.id}
                  prospect={prospect}
                  isSelected={selectedIds.has(prospect.id)}
                  onSelect={(checked) => handleSelectOne(prospect.id, checked)}
                  onApprove={() => handleApprove(prospect.id)}
                  onDeny={() => handleDeny(prospect)}
                  onAddToPipeline={() => handleAddToPipeline(prospect)}
                />
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  )
}

// Prospect Row Component
interface ProspectRowProps {
  prospect: BuyerProspect
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onApprove: () => void
  onDeny: () => void
  onAddToPipeline: () => void
}

function ProspectRow({
  prospect,
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
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
        />
      </td>
      <td className="px-4 py-3">
        <div>
          <div className="font-medium">{prospect.name}</div>
          {prospect.domain && (
            <div className="text-xs text-muted-foreground">{prospect.domain}</div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${typeColors.bg} ${typeColors.text}`}>
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
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full w-fit ${statusColors.bg} ${statusColors.text}`}>
            {PROSPECT_STATUS_LABELS[prospect.approvalStatus]}
          </span>
          {prospect.statusChangedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(prospect.statusChangedAt).toLocaleDateString()}
            </span>
          )}
          {prospect.approvalStatus === 'DENIED' && prospect.denialReason && (
            <span className="text-xs text-red-600 truncate max-w-32" title={prospect.denialReason}>
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
                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDeny}
                title="Deny"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </>
          )}
          {prospect.approvalStatus === 'APPROVED' && !isInPipeline && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddToPipeline}
            >
              <ArrowRightIcon className="h-4 w-4 mr-1" />
              Pipeline
            </Button>
          )}
          {isInPipeline && (
            <span className="text-xs text-muted-foreground">In Pipeline</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {prospect.approvalStatus !== 'APPROVED' && (
                <DropdownMenuItem onClick={onApprove}>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
              )}
              {prospect.approvalStatus !== 'DENIED' && (
                <DropdownMenuItem onClick={onDeny}>
                  <XIcon className="h-4 w-4 mr-2" />
                  Deny
                </DropdownMenuItem>
              )}
              {prospect.approvalStatus === 'APPROVED' && !isInPipeline && (
                <DropdownMenuItem onClick={onAddToPipeline}>
                  <ArrowRightIcon className="h-4 w-4 mr-2" />
                  Add to Pipeline
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
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

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
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

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
    </svg>
  )
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  )
}
