'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { AddProspectModal } from './AddProspectModal'
import { BulkImport } from './BulkImport'
import { BuyerType, DataQuality } from '@prisma/client'
import { BUYER_TYPE_LABELS, BUYER_TYPE_COLORS } from '@/lib/deal-tracker/constants'
import { DATA_QUALITY_LABELS, DATA_QUALITY_BADGE_CLASSES } from '@/lib/contact-system/constants'
import { cn } from '@/lib/utils'
import {
  Search,
  Plus,
  Upload,
  Building2,
  Globe,
  Linkedin,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CanonicalCompany {
  id: string
  name: string
  normalizedName: string
  website: string | null
  linkedInUrl: string | null
  companyType: BuyerType
  industryName: string | null
  headquarters: string | null
  employeeCount: number | null
  dataQuality: DataQuality
  _count?: {
    dealBuyers: number
    employees: number
  }
  createdAt: string
}

interface ProspectListProps {
  /** If provided, shows "Add to Deal" action */
  dealId?: string
  onAddToDeal?: (companyId: string) => void
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

export function ProspectList({ dealId, onAddToDeal }: ProspectListProps) {
  const [companies, setCompanies] = useState<CanonicalCompany[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterQuality, setFilterQuality] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(pagination.page))
      params.set('limit', '50')
      if (search) params.set('search', search)
      if (filterType !== 'all') params.set('companyType', filterType)
      if (filterQuality !== 'all') params.set('dataQuality', filterQuality)

      const res = await fetch(`/api/contact-system/canonical/companies?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies || [])
        setPagination((prev) => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0,
        }))
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setIsLoading(false)
    }
  }, [search, filterType, filterQuality, pagination.page])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const handleProspectCreated = () => {
    setShowAddModal(false)
    fetchCompanies()
  }

  const handleBulkImportComplete = () => {
    setShowBulkImport(false)
    fetchCompanies()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Prospect Companies</h2>
          <p className="text-sm text-muted-foreground">
            {pagination.total} total companies in your canonical database
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBulkImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Prospect
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={filterType}
          onValueChange={(v) => {
            setFilterType(v)
            setPagination((prev) => ({ ...prev, page: 1 }))
          }}
        >
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
        <Select
          value={filterQuality}
          onValueChange={(v) => {
            setFilterQuality(v)
            setPagination((prev) => ({ ...prev, page: 1 }))
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Data Quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quality</SelectItem>
            {Object.entries(DATA_QUALITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={fetchCompanies} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {search || filterType !== 'all' || filterQuality !== 'all'
                ? 'No companies match your filters'
                : 'No prospect companies yet'}
            </p>
            {!search && filterType === 'all' && filterQuality === 'all' && (
              <Button onClick={() => setShowAddModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Prospect
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Deals</TableHead>
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
                  {companies.map((company) => {
                    const typeColors = BUYER_TYPE_COLORS[company.companyType]
                    const qualityClasses = DATA_QUALITY_BADGE_CLASSES[company.dataQuality] || 'border-muted-foreground/30 text-muted-foreground'

                    return (
                      <motion.tr
                        key={company.id}
                        variants={rowVariants}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{company.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {company.website && (
                                  <a
                                    href={
                                      company.website.startsWith('http')
                                        ? company.website
                                        : `https://${company.website}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-foreground"
                                  >
                                    <Globe className="h-3 w-3" />
                                  </a>
                                )}
                                {company.linkedInUrl && (
                                  <a
                                    href={company.linkedInUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-foreground"
                                  >
                                    <Linkedin className="h-3 w-3" />
                                  </a>
                                )}
                                {company.headquarters && (
                                  <span className="truncate">{company.headquarters}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', typeColors.bg, typeColors.text)}>
                            {BUYER_TYPE_LABELS[company.companyType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {company.industryName || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              qualityClasses
                            )}
                          >
                            {DATA_QUALITY_LABELS[company.dataQuality]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {company._count?.dealBuyers || 0}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/prospects/${company.id}`}>
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {dealId && onAddToDeal && (
                                <DropdownMenuItem onClick={() => onAddToDeal(company.id)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add to Deal
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddProspectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handleProspectCreated}
        dealId={dealId}
      />
      <BulkImport
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onComplete={handleBulkImportComplete}
        dealId={dealId}
      />
    </div>
  )
}
