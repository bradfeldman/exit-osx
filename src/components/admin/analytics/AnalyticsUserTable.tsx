'use client'

import { useState } from 'react'
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
import { ChevronLeft, ChevronRight, Search, ExternalLink } from 'lucide-react'
import styles from '@/components/admin/admin-misc.module.css'

interface AnalyticsUser {
  id: string
  email: string
  name: string | null
  createdAt: string
  userType: string
  exposureState: string
  emailVerified: boolean
  planTier: string | null
  trialEndsAt: string | null
  eventCount: number
  sessionCount: number
  lastActiveAt: string
  lastDevice: string | null
  lastBrowser: string | null
  lastOs: string | null
  engagementStatus: 'active' | 'stalled' | 'dormant'
}

interface AnalyticsUserTableProps {
  initialUsers: AnalyticsUser[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusBadgeClass: Record<string, string> = {
  active: 'bg-green-light text-green-dark',
  stalled: 'bg-orange-light text-orange-dark',
  dormant: 'bg-red-light text-red-dark',
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function AnalyticsUserTable({ initialUsers, initialPagination }: AnalyticsUserTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('lastActive')

  const fetchUsers = async (page: number, currentSearch = search, currentStatus = statusFilter, currentSort = sortBy) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (currentSearch) params.set('search', currentSearch)
      if (currentStatus) params.set('status', currentStatus)
      if (currentSort) params.set('sortBy', currentSort)

      const response = await fetch(`/api/admin/analytics/users?${params}`)
      const data = await response.json()

      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => fetchUsers(1)
  const handleStatusChange = (value: string) => {
    const v = value === 'all' ? '' : value
    setStatusFilter(v)
    fetchUsers(1, search, v)
  }
  const handleSortChange = (value: string) => {
    const v = value === 'newest' ? 'created' : value
    setSortBy(v)
    fetchUsers(1, search, statusFilter, v)
  }

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.filterBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-64"
          />
          <Button variant="outline" size="sm" onClick={handleSearch} disabled={isLoading}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="stalled">Stalled</SelectItem>
            <SelectItem value="dormant">Dormant</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="lastActive">Last Active</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
          </SelectContent>
        </Select>
        <span className={styles.filterBarSpacer}>
          {pagination.total} users
        </span>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Last Device</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className={styles.emptyCell}>
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className={styles.cellPrimary}>{user.name || 'No name'}</div>
                      <div className={styles.cellMono}>{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusBadgeClass[user.engagementStatus]}>
                      {user.engagementStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className={styles.cellSecondary}>
                    {user.planTier || '-'}
                  </TableCell>
                  <TableCell className={`${styles.cellSecondary} ${styles.tabularNum}`}>{user.eventCount}</TableCell>
                  <TableCell className={`${styles.cellSecondary} ${styles.tabularNum}`}>{user.sessionCount}</TableCell>
                  <TableCell className={styles.cellSecondary}>
                    <span title={new Date(user.lastActiveAt).toLocaleString()}>
                      {timeAgo(user.lastActiveAt)}
                    </span>
                  </TableCell>
                  <TableCell className={styles.cellSecondary}>
                    {user.lastDevice || '-'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/analytics/users/${user.id}`}>
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <p className={styles.paginationInfo}>
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className={styles.paginationButtons}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUsers(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
