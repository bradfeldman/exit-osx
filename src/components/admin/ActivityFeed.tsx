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
import { ChevronLeft, ChevronRight, Download, Filter, X } from 'lucide-react'
import styles from '@/components/admin/admin-misc.module.css'

interface AuditLog {
  id: string
  actorEmail: string
  action: string
  targetType: string
  targetId: string | null
  ipAddress: string | null
  createdAt: string
  actor: {
    id: string
    email: string
    name: string | null
  }
}

interface ActivityFeedProps {
  initialLogs: AuditLog[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const actionColors: Record<string, string> = {
  'user.view': 'bg-blue-100 text-blue-800',
  'user.update': 'bg-yellow-100 text-yellow-800',
  'user.disable': 'bg-red-100 text-red-800',
  'impersonate.start': 'bg-purple-100 text-purple-800',
  'impersonate.end': 'bg-purple-100 text-purple-800',
  'organization.view': 'bg-green-100 text-green-800',
  'organization.update': 'bg-yellow-100 text-yellow-800',
  'ticket.create': 'bg-blue-100 text-blue-800',
  'ticket.update': 'bg-yellow-100 text-yellow-800',
}

const targetTypes = ['User', 'Organization', 'SupportTicket', 'ImpersonationSession', 'System']

export function ActivityFeed({ initialLogs, initialPagination }: ActivityFeedProps) {
  const [logs, setLogs] = useState(initialLogs)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    action: '',
    targetType: '',
    startDate: '',
    endDate: '',
  })

  const fetchLogs = async (page: number, currentFilters = filters) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (currentFilters.action) params.set('action', currentFilters.action)
      if (currentFilters.targetType) params.set('targetType', currentFilters.targetType)
      if (currentFilters.startDate) params.set('startDate', currentFilters.startDate)
      if (currentFilters.endDate) params.set('endDate', currentFilters.endDate)

      const response = await fetch(`/api/admin/activity?${params}`)
      const data = await response.json()

      setLogs(data.logs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyFilters = () => {
    fetchLogs(1, filters)
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      action: '',
      targetType: '',
      startDate: '',
      endDate: '',
    }
    setFilters(clearedFilters)
    fetchLogs(1, clearedFilters)
  }

  const handleExport = () => {
    const params = new URLSearchParams({ format: 'csv' })
    if (filters.action) params.set('action', filters.action)
    if (filters.targetType) params.set('targetType', filters.targetType)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)

    window.location.href = `/api/admin/activity?${params}`
  }

  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

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
            <Badge variant="secondary" className="ml-2">
              Active
            </Badge>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className={styles.filterPanel}>
          <div className={`${styles.filterGrid} ${styles.filterGrid4}`}>
            <div className={styles.filterField}>
              <Label htmlFor="action">Action</Label>
              <Input
                id="action"
                placeholder="e.g., user.update"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              />
            </div>
            <div className={styles.filterField}>
              <Label htmlFor="targetType">Target Type</Label>
              <Select
                value={filters.targetType}
                onValueChange={(value) => setFilters({ ...filters, targetType: value })}
              >
                <SelectTrigger id="targetType">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  {targetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={styles.filterField}>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className={styles.filterField}>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.filterActions}>
            <Button onClick={handleApplyFilters} disabled={isLoading}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className={styles.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className={styles.emptyCell}>
                  No activity logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell style={{ whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className={styles.cellPrimary}>
                        {log.actor.name || 'Unknown'}
                      </div>
                      <div className={styles.cellSecondary}>
                        {log.actorEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={actionColors[log.action] || 'bg-gray-100 text-gray-800'}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className={styles.cellSecondary}>{log.targetType}</div>
                      {log.targetId && (
                        <div className={styles.cellMono}>
                          {log.targetId.slice(0, 12)}...
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={styles.cellMono}>
                    {log.ipAddress || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <p className={styles.paginationInfo}>
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} entries
        </p>
        <div className={styles.paginationButtons}>
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
