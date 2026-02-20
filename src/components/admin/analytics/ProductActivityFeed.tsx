'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { ChevronLeft, ChevronRight, Filter, X, RefreshCw } from 'lucide-react'
import styles from '@/components/admin/admin-misc.module.css'

interface ProductEvent {
  id: string
  userId: string
  eventName: string
  eventCategory: string
  metadata: unknown
  page: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  ipAddress: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

interface ProductActivityFeedProps {
  initialEvents: ProductEvent[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const categoryBadgeClass: Record<string, string> = {
  auth: 'bg-purple-100 text-purple-800',
  navigation: 'bg-blue-100 text-blue-800',
  onboarding: 'bg-green-100 text-green-800',
  assessment: 'bg-yellow-100 text-yellow-800',
  task: 'bg-orange-100 text-orange-800',
  valuation: 'bg-pink-100 text-pink-800',
  subscription: 'bg-indigo-100 text-indigo-800',
}

const categories = ['auth', 'navigation', 'onboarding', 'assessment', 'task', 'valuation', 'subscription']

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

export function ProductActivityFeed({ initialEvents, initialPagination }: ProductActivityFeedProps) {
  const [events, setEvents] = useState(initialEvents)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    eventCategory: '',
    eventName: '',
    userId: '',
    startDate: '',
    endDate: '',
  })

  const fetchEvents = async (page: number, currentFilters = filters) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (currentFilters.eventCategory) params.set('eventCategory', currentFilters.eventCategory)
      if (currentFilters.eventName) params.set('eventName', currentFilters.eventName)
      if (currentFilters.userId) params.set('userId', currentFilters.userId)
      if (currentFilters.startDate) params.set('startDate', currentFilters.startDate)
      if (currentFilters.endDate) params.set('endDate', currentFilters.endDate)

      const response = await fetch(`/api/admin/analytics/activity?${params}`)
      const data = await response.json()

      setEvents(data.events)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => fetchEvents(pagination.page)
  const handleApplyFilters = () => fetchEvents(1, filters)

  const handleClearFilters = () => {
    const cleared = { eventCategory: '', eventName: '', userId: '', startDate: '', endDate: '' }
    setFilters(cleared)
    fetchEvents(1, cleared)
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.filterBar}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={hasActiveFilters ? 'border-primary' : ''}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">Active</Badge>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
        <span className={styles.filterBarSpacer}>
          {pagination.total} events
        </span>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={styles.filterPanel}>
          <div className={`${styles.filterGrid} ${styles.filterGrid5}`}>
            <div className={styles.filterField}>
              <Label>Category</Label>
              <Select
                value={filters.eventCategory}
                onValueChange={(value) => setFilters({ ...filters, eventCategory: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={styles.filterField}>
              <Label>Event Name</Label>
              <Input
                placeholder="e.g., page_view"
                value={filters.eventName}
                onChange={(e) => setFilters({ ...filters, eventName: e.target.value })}
              />
            </div>
            <div className={styles.filterField}>
              <Label>User ID</Label>
              <Input
                placeholder="User ID"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              />
            </div>
            <div className={styles.filterField}>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className={styles.filterField}>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.filterActions}>
            <Button onClick={handleApplyFilters} disabled={isLoading}>Apply</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Device</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className={styles.emptyCell}>
                  No events yet. Events will appear as users interact with the product.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell style={{ whiteSpace: 'nowrap', fontSize: 14 }}>
                    <span title={new Date(event.createdAt).toLocaleString()}>
                      {timeAgo(event.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className={styles.cellPrimary}>{event.user.name || 'Unknown'}</div>
                      <div className={styles.cellMono}>{event.user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={styles.cellMono}>{event.eventName}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={categoryBadgeClass[event.eventCategory] || 'bg-gray-100 text-gray-800'}
                    >
                      {event.eventCategory}
                    </Badge>
                  </TableCell>
                  <TableCell className={styles.cellSecondary}>
                    {event.page || '-'}
                  </TableCell>
                  <TableCell className={styles.cellSecondary}>
                    {event.deviceType ? `${event.browser || ''} / ${event.os || ''}` : '-'}
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
              onClick={() => fetchEvents(pagination.page - 1)}
              disabled={pagination.page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents(pagination.page + 1)}
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
