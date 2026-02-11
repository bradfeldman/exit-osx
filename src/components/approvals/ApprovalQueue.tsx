'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ApprovalStatus, BuyerType } from '@prisma/client'
import { BUYER_TYPE_LABELS, BUYER_TYPE_COLORS } from '@/lib/deal-tracker/constants'
import {
  APPROVAL_STATUS_LABELS,
} from '@/lib/contact-system/constants'
import { cn } from '@/lib/utils'
import {
  Search,
  CheckCircle,
  XCircle,
  Pause,
  RotateCcw,
  MoreHorizontal,
  Building2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCheck,
  ExternalLink,
  Globe,
  Linkedin,
} from 'lucide-react'
import Link from 'next/link'

interface BuyerForApproval {
  id: string
  approvalStatus: ApprovalStatus
  approvalNote: string | null
  approvedAt: string | null
  currentStage: string
  createdAt: string
  canonicalCompany: {
    id: string
    name: string
    companyType: BuyerType
    website: string | null
    linkedInUrl: string | null
    industryName: string | null
    headquarters: string | null
    employeeCount: number | null
    _count?: {
      dealBuyers: number
    }
  }
}

interface ApprovalQueueProps {
  dealId: string
  dealName?: string
  onApprovalChange?: () => void
}

// Status colors mapping with proper format
const STATUS_COLORS: Record<ApprovalStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  APPROVED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  HOLD: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  DENIED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
}

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

export function ApprovalQueue({ dealId, dealName, onApprovalChange }: ApprovalQueueProps) {
  const [buyers, setBuyers] = useState<BuyerForApproval[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  // Denial modal state
  const [showDenialModal, setShowDenialModal] = useState(false)
  const [denialReason, setDenialReason] = useState('')
  const [denialTargetIds, setDenialTargetIds] = useState<string[]>([])

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    hold: 0,
    denied: 0,
  })

  const fetchBuyers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus !== 'all') params.set('approvalStatus', filterStatus)
      if (filterType !== 'all') params.set('companyType', filterType)

      const res = await fetch(`/api/deals/${dealId}/buyers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setBuyers(data.buyers || [])

        // Calculate stats
        const allBuyers = data.buyers || []
        setStats({
          pending: allBuyers.filter((b: BuyerForApproval) => b.approvalStatus === 'PENDING').length,
          approved: allBuyers.filter((b: BuyerForApproval) => b.approvalStatus === 'APPROVED').length,
          hold: allBuyers.filter((b: BuyerForApproval) => b.approvalStatus === 'HOLD').length,
          denied: allBuyers.filter((b: BuyerForApproval) => b.approvalStatus === 'DENIED').length,
        })
      }
    } catch (error) {
      console.error('Error fetching buyers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dealId, search, filterStatus, filterType])

  useEffect(() => {
    fetchBuyers()
  }, [fetchBuyers])

  const handleApprovalAction = async (
    buyerIds: string[],
    status: ApprovalStatus,
    note?: string
  ) => {
    if (buyerIds.length === 0) return

    setIsProcessing(true)
    try {
      if (buyerIds.length === 1) {
        // Single approval
        const res = await fetch(`/api/deals/${dealId}/buyers/${buyerIds[0]}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, note }),
        })
        if (!res.ok) throw new Error('Failed to update approval')
      } else {
        // Bulk approval
        const res = await fetch(`/api/deals/${dealId}/buyers/bulk-approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerIds, status, note }),
        })
        if (!res.ok) throw new Error('Failed to update approvals')
      }

      // Clear selection and refresh
      setSelectedIds(new Set())
      fetchBuyers()
      onApprovalChange?.()
    } catch (error) {
      console.error('Error updating approval:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApprove = (buyerIds: string[]) => {
    handleApprovalAction(buyerIds, ApprovalStatus.APPROVED)
  }

  const handleHold = (buyerIds: string[]) => {
    handleApprovalAction(buyerIds, ApprovalStatus.HOLD)
  }

  const handleDeny = (buyerIds: string[]) => {
    setDenialTargetIds(buyerIds)
    setDenialReason('')
    setShowDenialModal(true)
  }

  const confirmDenial = () => {
    if (!denialReason.trim()) return
    handleApprovalAction(denialTargetIds, ApprovalStatus.DENIED, denialReason)
    setShowDenialModal(false)
    setDenialTargetIds([])
    setDenialReason('')
  }

  const handleReset = (buyerIds: string[]) => {
    handleApprovalAction(buyerIds, ApprovalStatus.PENDING)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === buyers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(buyers.map((b) => b.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectedArray = Array.from(selectedIds)
  const hasSelection = selectedArray.length > 0

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Approval Queue</h2>
          <p className="text-sm text-muted-foreground">
            {dealName ? `${dealName} - ` : ''}Review and approve buyers for outreach
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick stats */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span>{stats.pending} pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span>{stats.approved} approved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span>{stats.hold} on hold</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span>{stats.denied} denied</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="HOLD">On Hold</SelectItem>
            <SelectItem value="DENIED">Denied</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Buyer Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(BUYER_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={fetchBuyers} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>

        {/* Bulk actions */}
        {hasSelection && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">
              {selectedArray.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApprove(selectedArray)}
              disabled={isProcessing}
              className="text-green-600 border-green-300 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleHold(selectedArray)}
              disabled={isProcessing}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <Pause className="h-4 w-4 mr-1" />
              Hold
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeny(selectedArray)}
              disabled={isProcessing}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Deny
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : buyers.length === 0 ? (
          <div className="text-center py-12">
            <CheckCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {filterStatus === 'PENDING'
                ? 'No buyers pending approval'
                : 'No buyers match your filters'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === buyers.length && buyers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                <motion.tbody
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="contents"
                >
                  {buyers.map((buyer) => {
                    const typeColors = BUYER_TYPE_COLORS[buyer.canonicalCompany.companyType]
                    const statusColors = STATUS_COLORS[buyer.approvalStatus]
                    const isSelected = selectedIds.has(buyer.id)

                    return (
                      <motion.tr
                        key={buyer.id}
                        variants={rowVariants}
                        className={cn(
                          'border-b last:border-b-0 hover:bg-muted/30 transition-colors',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(buyer.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/dashboard/deals/${dealId}/buyers/${buyer.id}`}
                                className="font-medium truncate hover:underline"
                              >
                                {buyer.canonicalCompany.name}
                              </Link>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {buyer.canonicalCompany.website && (
                                  <a
                                    href={
                                      buyer.canonicalCompany.website.startsWith('http')
                                        ? buyer.canonicalCompany.website
                                        : `https://${buyer.canonicalCompany.website}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-foreground"
                                  >
                                    <Globe className="h-3 w-3" />
                                  </a>
                                )}
                                {buyer.canonicalCompany.linkedInUrl && (
                                  <a
                                    href={buyer.canonicalCompany.linkedInUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-foreground"
                                  >
                                    <Linkedin className="h-3 w-3" />
                                  </a>
                                )}
                                {buyer.canonicalCompany.industryName && (
                                  <span className="truncate">
                                    {buyer.canonicalCompany.industryName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', typeColors.bg, typeColors.text)}>
                            {BUYER_TYPE_LABELS[buyer.canonicalCompany.companyType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', statusColors.bg, statusColors.text)}>
                            {APPROVAL_STATUS_LABELS[buyer.approvalStatus]}
                          </Badge>
                          {buyer.approvalNote && (
                            <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                              {buyer.approvalNote}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {buyer.currentStage.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(buyer.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isProcessing}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/deals/${dealId}/buyers/${buyer.id}`}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {buyer.approvalStatus !== 'APPROVED' && (
                                <DropdownMenuItem onClick={() => handleApprove([buyer.id])}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {buyer.approvalStatus !== 'HOLD' && (
                                <DropdownMenuItem onClick={() => handleHold([buyer.id])}>
                                  <Pause className="h-4 w-4 mr-2 text-orange-600" />
                                  Put on Hold
                                </DropdownMenuItem>
                              )}
                              {buyer.approvalStatus !== 'DENIED' && (
                                <DropdownMenuItem onClick={() => handleDeny([buyer.id])}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                  Deny
                                </DropdownMenuItem>
                              )}
                              {buyer.approvalStatus !== 'PENDING' && (
                                <DropdownMenuItem onClick={() => handleReset([buyer.id])}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Reset to Pending
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </motion.tbody>
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </div>

      {/* Denial Modal */}
      <Dialog open={showDenialModal} onOpenChange={setShowDenialModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Deny {denialTargetIds.length > 1 ? 'Buyers' : 'Buyer'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for denying{' '}
              {denialTargetIds.length > 1
                ? `these ${denialTargetIds.length} buyers`
                : 'this buyer'}
              . This will be recorded in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter reason for denial..."
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDenialModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDenial}
              disabled={!denialReason.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Deny {denialTargetIds.length > 1 ? 'Buyers' : 'Buyer'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
