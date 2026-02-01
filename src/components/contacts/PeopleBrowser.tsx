'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Search,
  Loader2,
  User,
  Mail,
  Building2,
  ChevronLeft,
  ChevronRight,
  Linkedin,
} from 'lucide-react'
import { DATA_QUALITY_LABELS } from '@/lib/contact-system/constants'

interface Person {
  id: string
  firstName: string
  lastName: string
  normalizedName: string
  email: string | null
  linkedInUrl: string | null
  currentTitle: string | null
  dataQuality: 'PROVISIONAL' | 'SUGGESTED' | 'VERIFIED' | 'ENRICHED'
  createdAt: string
  canonicalCompany: {
    id: string
    name: string
  } | null
  emails: Array<{ email: string; isPrimary: boolean }>
  _count: {
    buyerContacts: number
  }
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface Summary {
  provisional: number
  suggested: number
  verified: number
  enriched: number
}

const qualityColors = {
  PROVISIONAL: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUGGESTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  ENRICHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
}

export function PeopleBrowser() {
  const [people, setPeople] = useState<Person[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [dataQuality, setDataQuality] = useState<string>('all')
  const [hasCompany, setHasCompany] = useState<string>('all')
  const [page, setPage] = useState(1)

  const fetchPeople = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '25')
      if (search) params.set('search', search)
      if (dataQuality !== 'all') params.set('dataQuality', dataQuality)
      if (hasCompany !== 'all') params.set('hasCompany', hasCompany)

      const res = await fetch(`/api/canonical/people?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPeople(data.people)
        setPagination(data.pagination)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching people:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, search, dataQuality, hasCompany])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={cn('cursor-pointer transition-all', dataQuality === 'PROVISIONAL' && 'ring-2 ring-primary')}>
            <CardContent className="p-4" onClick={() => { setDataQuality(dataQuality === 'PROVISIONAL' ? 'all' : 'PROVISIONAL'); setPage(1) }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{summary.provisional}</p>
                  <p className="text-sm text-muted-foreground">Provisional</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('cursor-pointer transition-all', dataQuality === 'SUGGESTED' && 'ring-2 ring-primary')}>
            <CardContent className="p-4" onClick={() => { setDataQuality(dataQuality === 'SUGGESTED' ? 'all' : 'SUGGESTED'); setPage(1) }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{summary.suggested}</p>
                  <p className="text-sm text-muted-foreground">Suggested</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('cursor-pointer transition-all', dataQuality === 'VERIFIED' && 'ring-2 ring-primary')}>
            <CardContent className="p-4" onClick={() => { setDataQuality(dataQuality === 'VERIFIED' ? 'all' : 'VERIFIED'); setPage(1) }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{summary.verified}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('cursor-pointer transition-all', dataQuality === 'ENRICHED' && 'ring-2 ring-primary')}>
            <CardContent className="p-4" onClick={() => { setDataQuality(dataQuality === 'ENRICHED' ? 'all' : 'ENRICHED'); setPage(1) }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{summary.enriched}</p>
                  <p className="text-sm text-muted-foreground">Enriched</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
        </div>
        <Button onClick={handleSearch} variant="secondary">
          Search
        </Button>
        <Select value={hasCompany} onValueChange={(v) => { setHasCompany(v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All People</SelectItem>
            <SelectItem value="true">With Company</SelectItem>
            <SelectItem value="false">No Company</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dataQuality} onValueChange={(v) => { setDataQuality(v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Quality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quality</SelectItem>
            {Object.entries(DATA_QUALITY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Deals</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : people.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <User className="h-8 w-8 mb-2" />
                    <p>No people found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              people.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {person.firstName} {person.lastName}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {person.email ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{person.email}</span>
                      </div>
                    ) : person.emails.length > 0 ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span>{person.emails[0].email}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {person.canonicalCompany ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span>{person.canonicalCompany.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {person.currentTitle ? (
                      <span className="text-sm">{person.currentTitle}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', qualityColors[person.dataQuality])}>
                      {DATA_QUALITY_LABELS[person.dataQuality]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span>{person._count.buyerContacts}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {person.linkedInUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          asChild
                        >
                          <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer">
                            <Linkedin className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
