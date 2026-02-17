'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import {
  FileText,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  Loader2,
  DollarSign,
  Scale,
  Settings,
  Users,
  UserCheck,
  Shield,
  Receipt,
  TrendingUp,
  Code,
  Building,
  FolderOpen,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { DataRoomCategory, DocumentStatus } from '@prisma/client'

// --- Types ---

interface DataRoomDocument {
  id: string
  companyId: string
  category: DataRoomCategory
  documentName: string
  description: string | null
  fileUrl: string | null
  filePath: string | null
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  status: DocumentStatus
  folderId: string | null
  version: number
  uploadedByUserId: string | null
  createdAt: string
  updatedAt: string
  uploadedBy?: {
    id: string
    name: string | null
    email: string
  } | null
}

// --- Category Config ---

const CATEGORY_CONFIG: Record<
  DataRoomCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  FINANCIAL: { label: 'Financial', icon: DollarSign },
  LEGAL: { label: 'Legal', icon: Scale },
  OPERATIONS: { label: 'Operations', icon: Settings },
  CUSTOMERS: { label: 'Customers', icon: Users },
  EMPLOYEES: { label: 'Employees', icon: UserCheck },
  IP: { label: 'Intellectual Property', icon: Shield },
  TAX: { label: 'Tax', icon: Receipt },
  SALES_MARKETING: { label: 'Sales & Marketing', icon: TrendingUp },
  TECHNOLOGY: { label: 'Technology', icon: Code },
  REAL_ESTATE: { label: 'Real Estate', icon: Building },
  CUSTOM: { label: 'Custom', icon: FolderOpen },
  TASK_PROOF: { label: 'Task Evidence', icon: FileText },
  ENVIRONMENTAL: { label: 'Environmental', icon: FileText },
  INSURANCE: { label: 'Insurance', icon: FileText },
  CORPORATE: { label: 'Corporate', icon: FileText },
}

// --- Status Badge ---

function StatusBadge({ status }: { status: DocumentStatus }) {
  const config = {
    CURRENT: { label: 'Current', variant: 'default' as const, icon: CheckCircle2 },
    NEEDS_UPDATE: { label: 'Needs Update', variant: 'secondary' as const, icon: Clock },
    OVERDUE: { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle },
  }

  const { label, variant, icon: Icon } = config[status]

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  )
}

// --- Format File Size ---

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// --- Format Date ---

function formatDate(dateString: string | null): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// --- Sidebar Category Item ---

function CategoryItem({
  category,
  count,
  isActive,
  onClick,
}: {
  category: DataRoomCategory | 'ALL'
  count: number
  isActive: boolean
  onClick: () => void
}) {
  if (category === 'ALL') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted/50'
        )}
      >
        <FolderOpen className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">All Documents</span>
        <span
          className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isActive
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {count}
        </span>
      </button>
    )
  }

  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted/50'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 text-left truncate">{config.label}</span>
      <span
        className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          isActive
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {count}
      </span>
    </button>
  )
}

// --- Main Component ---

export function VirtualDataRoom() {
  const { selectedCompanyId } = useCompany()
  const [documents, setDocuments] = useState<DataRoomDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<
    DataRoomCategory | 'ALL'
  >('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<
    'documentName' | 'status' | 'category' | 'updatedAt' | 'fileSize'
  >('documentName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    setError(false)

    try {
      const res = await fetch(
        `/api/companies/${selectedCompanyId}/data-room`
      )
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      setDocuments(json.documents || [])
    } catch {
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Track document view/download
  const trackDocumentView = useCallback(
    async (documentId: string) => {
      if (!selectedCompanyId) return

      try {
        // Log activity via DataRoomActivity
        await fetch(
          `/api/companies/${selectedCompanyId}/data-room/activity`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'VIEWED_DOCUMENT',
              documentId,
            }),
          }
        )
      } catch (error) {
        console.error('Failed to track document view:', error)
      }
    },
    [selectedCompanyId]
  )

  // Handle document view
  const handleViewDocument = useCallback(
    (doc: DataRoomDocument) => {
      if (!doc.fileUrl) return
      trackDocumentView(doc.id)
      window.open(doc.fileUrl, '_blank')
    },
    [trackDocumentView]
  )

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<DataRoomCategory, number>> = {}
    documents.forEach((doc) => {
      counts[doc.category] = (counts[doc.category] || 0) + 1
    })
    return counts
  }, [documents])

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = documents

    // Filter by category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter((doc) => doc.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (doc) =>
          doc.documentName.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.fileName?.toLowerCase().includes(query)
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareResult = 0

      switch (sortField) {
        case 'documentName':
          compareResult = a.documentName.localeCompare(b.documentName)
          break
        case 'status':
          compareResult = a.status.localeCompare(b.status)
          break
        case 'category':
          compareResult = a.category.localeCompare(b.category)
          break
        case 'updatedAt':
          compareResult =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'fileSize':
          compareResult = (a.fileSize || 0) - (b.fileSize || 0)
          break
      }

      return sortDirection === 'asc' ? compareResult : -compareResult
    })

    return sorted
  }, [documents, selectedCategory, searchQuery, sortField, sortDirection])

  // Handle sort
  const handleSort = (
    field: 'documentName' | 'status' | 'category' | 'updatedAt' | 'fileSize'
  ) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get categories with documents
  const categoriesWithDocs = useMemo(() => {
    return Object.keys(CATEGORY_CONFIG).filter(
      (cat) => categoryCounts[cat as DataRoomCategory]
    ) as DataRoomCategory[]
  }, [categoryCounts])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!selectedCompanyId || error) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">
          Failed to load virtual data room.
        </p>
        <Button variant="ghost" size="sm" onClick={fetchDocuments} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Sidebar */}
      <aside
        className={cn(
          'shrink-0 transition-all duration-300',
          sidebarCollapsed ? 'lg:w-16 w-full' : 'lg:w-64 w-full'
        )}
      >
        <div className="lg:sticky lg:top-6 space-y-6">
          {/* Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full justify-center lg:justify-start"
          >
            {sidebarCollapsed ? (
              <>
                <ChevronRight className="w-4 h-4 lg:inline hidden" />
                <ChevronDown className="w-4 h-4 lg:hidden" />
                <span className="lg:hidden ml-2">Show Categories</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 lg:inline hidden" />
                <ChevronRight className="w-4 h-4 lg:hidden" />
                <span className="lg:hidden ml-2">Hide Categories</span>
              </>
            )}
          </Button>

          {!sidebarCollapsed && (
            <>
              {/* All Documents */}
              <div className="space-y-1">
                <CategoryItem
                  category="ALL"
                  count={documents.length}
                  isActive={selectedCategory === 'ALL'}
                  onClick={() => setSelectedCategory('ALL')}
                />
              </div>

              {/* Category Navigation */}
              {categoriesWithDocs.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase px-3 mb-2">
                    Categories
                  </p>
                  {categoriesWithDocs.map((cat) => (
                    <CategoryItem
                      key={cat}
                      category={cat}
                      count={categoryCounts[cat] || 0}
                      isActive={selectedCategory === cat}
                      onClick={() => setSelectedCategory(cat)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              VIRTUAL DATA ROOM
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredAndSortedDocuments.length} document
              {filteredAndSortedDocuments.length !== 1 ? 's' : ''}
              {selectedCategory !== 'ALL' &&
                ` in ${CATEGORY_CONFIG[selectedCategory].label}`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>

            {/* Upload Button */}
            <Button size="sm" className="gap-1.5 w-full sm:w-auto">
              <Upload className="w-3.5 h-3.5" />
              Upload
            </Button>
          </div>
        </div>

        {/* Documents Table */}
        {filteredAndSortedDocuments.length === 0 ? (
          <div className="rounded-xl border border-border/50 bg-card p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground">
              No documents found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Upload documents to get started'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('documentName')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortField === 'documentName' && (
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-transform',
                            sortDirection === 'desc' && 'rotate-180'
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === 'status' && (
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-transform',
                            sortDirection === 'desc' && 'rotate-180'
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hidden md:table-cell"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center gap-1">
                      Category
                      {sortField === 'category' && (
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-transform',
                            sortDirection === 'desc' && 'rotate-180'
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hidden lg:table-cell"
                    onClick={() => handleSort('updatedAt')}
                  >
                    <div className="flex items-center gap-1">
                      Uploaded
                      {sortField === 'updatedAt' && (
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-transform',
                            sortDirection === 'desc' && 'rotate-180'
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hidden xl:table-cell"
                    onClick={() => handleSort('fileSize')}
                  >
                    <div className="flex items-center gap-1">
                      Size
                      {sortField === 'fileSize' && (
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-transform',
                            sortDirection === 'desc' && 'rotate-180'
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedDocuments.map((doc) => {
                  const CategoryIcon = CATEGORY_CONFIG[doc.category].icon
                  const hasFile = !!doc.fileUrl

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-start gap-2 min-w-0">
                          <CategoryIcon className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {doc.documentName}
                            </p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {doc.description}
                              </p>
                            )}
                            {doc.fileName && (
                              <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                                {doc.fileName}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hasFile ? (
                          <StatusBadge status={doc.status} />
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <AlertCircle className="w-3 h-3" />
                            <span className="hidden sm:inline">Not Uploaded</span>
                            <span className="sm:hidden">Missing</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {CATEGORY_CONFIG[doc.category].label}
                        </span>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {hasFile ? formatDate(doc.updatedAt) : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {hasFile ? formatFileSize(doc.fileSize) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasFile ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            className="gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            View
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" className="gap-1.5">
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
