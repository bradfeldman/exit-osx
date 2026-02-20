'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  Search,
  Building2,
  CheckCircle,
  XCircle,
  Pause,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  FileCheck,
  FileText,
  DollarSign,
  Scale,
} from 'lucide-react'

interface SellerBuyer {
  id: string
  companyName: string
  companyType: string
  industry: string | null
  headquarters: string | null
  employeeRange: string | null
  currentStage: string
  approvalStatus: string
  addedDate: string
  lastActivityDate: string | null
  hasNDA: boolean
  hasCIM: boolean
  hasIOI: boolean
  hasLOI: boolean
  progressPercent: number
}

interface SellerBuyerListProps {
  dealId: string
  onApprovalChange?: () => void
}

// Approval status colors
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Pending Review': { bg: 'bg-orange-light dark:bg-orange-dark/30', text: 'text-orange-dark dark:text-orange' },
  'Approved': { bg: 'bg-green-light dark:bg-green-dark/30', text: 'text-green-dark dark:text-green' },
  'On Hold': { bg: 'bg-orange-light dark:bg-orange-dark/30', text: 'text-orange-dark dark:text-orange' },
  'Denied': { bg: 'bg-red-light dark:bg-red-dark/30', text: 'text-red-dark dark:text-red' },
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

export function SellerBuyerList({ dealId, onApprovalChange }: SellerBuyerListProps) {
  const [buyers, setBuyers] = useState<SellerBuyer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const fetchBuyers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterStatus !== 'all') params.set('approvalStatus', filterStatus)

      const res = await fetch(`/api/seller/${dealId}/buyers?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setBuyers(data.buyers || [])
      }
    } catch (error) {
      console.error('Error fetching buyers:', error)
    } finally {
      setIsLoading(false)
    }
  }, [dealId, search, filterStatus])

  useEffect(() => {
    fetchBuyers()
  }, [fetchBuyers])

  const handleApproval = async (buyerId: string, action: 'approve' | 'deny' | 'hold', reason?: string) => {
    setIsProcessing(buyerId)
    try {
      const res = await fetch(`/api/seller/${dealId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerId,
          action,
          reason,
        }),
      })

      if (res.ok) {
        fetchBuyers()
        onApprovalChange?.()
      }
    } catch (error) {
      console.error('Error processing approval:', error)
    } finally {
      setIsProcessing(null)
    }
  }

  const pendingCount = buyers.filter(b => b.approvalStatus === 'Pending Review').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Prospective Buyers</h2>
          <p className="text-sm text-muted-foreground">
            {pendingCount > 0 && (
              <span className="text-orange-dark font-medium">{pendingCount} pending your review • </span>
            )}
            {buyers.length} total buyers
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buyers..."
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
            <SelectItem value="PENDING">Pending Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="HOLD">On Hold</SelectItem>
            <SelectItem value="DENIED">Denied</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={fetchBuyers} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : buyers.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No buyers match your filters</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Milestones</TableHead>
                <TableHead>Status</TableHead>
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
                    const statusColors = STATUS_COLORS[buyer.approvalStatus] || STATUS_COLORS['Pending Review']
                    const isPending = buyer.approvalStatus === 'Pending Review'

                    return (
                      <motion.tr
                        key={buyer.id}
                        variants={rowVariants}
                        className={cn(
                          'border-b last:border-b-0 hover:bg-muted/30 transition-colors',
                          isPending && 'bg-orange-light/50 dark:bg-orange-dark/10'
                        )}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{buyer.companyName}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {buyer.industry && <span>{buyer.industry}</span>}
                                {buyer.headquarters && (
                                  <>
                                    {buyer.industry && <span>•</span>}
                                    <span>{buyer.headquarters}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {buyer.companyType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24 space-y-1">
                            <Progress value={buyer.progressPercent} className="h-1.5" />
                            <p className="text-xs text-muted-foreground">{buyer.currentStage}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div
                              className={cn(
                                'w-6 h-6 rounded flex items-center justify-center',
                                buyer.hasNDA ? 'bg-green-light text-green-dark' : 'bg-muted text-muted-foreground'
                              )}
                              title="NDA"
                            >
                              <FileCheck className="h-3.5 w-3.5" />
                            </div>
                            <div
                              className={cn(
                                'w-6 h-6 rounded flex items-center justify-center',
                                buyer.hasCIM ? 'bg-green-light text-green-dark' : 'bg-muted text-muted-foreground'
                              )}
                              title="CIM"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div
                              className={cn(
                                'w-6 h-6 rounded flex items-center justify-center',
                                buyer.hasIOI ? 'bg-green-light text-green-dark' : 'bg-muted text-muted-foreground'
                              )}
                              title="IOI"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                            </div>
                            <div
                              className={cn(
                                'w-6 h-6 rounded flex items-center justify-center',
                                buyer.hasLOI ? 'bg-green-light text-green-dark' : 'bg-muted text-muted-foreground'
                              )}
                              title="LOI"
                            >
                              <Scale className="h-3.5 w-3.5" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', statusColors.bg, statusColors.text)}>
                            {buyer.approvalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isPending ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-dark hover:text-green-dark hover:bg-green-light"
                                onClick={() => handleApproval(buyer.id, 'approve')}
                                disabled={isProcessing === buyer.id}
                              >
                                {isProcessing === buyer.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-dark hover:text-red-dark hover:bg-red-light"
                                onClick={() => {
                                  const reason = prompt('Reason for denial:')
                                  if (reason) handleApproval(buyer.id, 'deny', reason)
                                }}
                                disabled={isProcessing === buyer.id}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={isProcessing === buyer.id}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {buyer.approvalStatus !== 'Approved' && (
                                  <DropdownMenuItem
                                    onClick={() => handleApproval(buyer.id, 'approve')}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-dark" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {buyer.approvalStatus !== 'On Hold' && (
                                  <DropdownMenuItem
                                    onClick={() => handleApproval(buyer.id, 'hold')}
                                  >
                                    <Pause className="h-4 w-4 mr-2 text-orange" />
                                    Put on Hold
                                  </DropdownMenuItem>
                                )}
                                {buyer.approvalStatus !== 'Denied' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const reason = prompt('Reason for denial:')
                                      if (reason) handleApproval(buyer.id, 'deny', reason)
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2 text-red-dark" />
                                    Deny
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
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
    </div>
  )
}
