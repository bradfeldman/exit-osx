'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface Company {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  workspace: {
    id: string
    name: string
    planTier: string
    subscriptionStatus: string
  }
  memberCount: number
  lastLogin: string | null
  qbConnected: boolean
}

interface CompanyTableProps {
  initialCompanies: Company[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const planTierConfig: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline'; className?: string }> = {
  FOUNDATION: { label: 'Foundation', variant: 'secondary' },
  GROWTH: { label: 'Growth', variant: 'default', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300' },
  DEAL_ROOM: { label: 'Deal Room', variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300' },
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString()
}

function weeksSinceCreation(dateStr: string): number {
  const created = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  return Math.floor(diffMs / (7 * 86400000))
}

export function CompanyTable({ initialCompanies, initialPagination }: CompanyTableProps) {
  const [companies, setCompanies] = useState(initialCompanies)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchCompanies = async (page: number, searchQuery: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/admin/companies?${params}`)
      const data = await response.json()

      setCompanies(data.companies)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchCompanies(1, search)
  }

  const handlePageChange = (newPage: number) => {
    fetchCompanies(newPage, search)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by company name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          Search
        </Button>
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company Name</TableHead>
              <TableHead>Subscription Tier</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>QuickBooks</TableHead>
              <TableHead>Weeks</TableHead>
              <TableHead>Members</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No companies found
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => {
                const tierCfg = planTierConfig[company.workspace.planTier]
                const weeks = weeksSinceCreation(company.createdAt)

                return (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">{company.workspace.name}</div>
                    </TableCell>
                    <TableCell>
                      {tierCfg ? (
                        <Badge variant={tierCfg.variant} className={tierCfg.className}>
                          {tierCfg.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{company.workspace.planTier}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatRelativeDate(company.lastLogin)}</span>
                    </TableCell>
                    <TableCell>
                      {company.qbConnected ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300">
                          Connected
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{weeks}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{company.memberCount}</span>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {companies.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} companies
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
