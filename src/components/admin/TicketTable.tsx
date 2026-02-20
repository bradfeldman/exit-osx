'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import styles from '@/components/admin/admin-misc.module.css'

interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  userEmail: string
  status: string
  priority: string
  category: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  } | null
  assignedTo: {
    id: string
    email: string
    name: string | null
  } | null
  _count: {
    messages: number
  }
}

interface TicketTableProps {
  initialTickets: Ticket[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const statusBadgeClass: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

const priorityBadgeClass: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export function TicketTable({ initialTickets, initialPagination }: TicketTableProps) {
  const [tickets, setTickets] = useState(initialTickets)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
  })

  const fetchTickets = async (page: number, currentFilters = filters) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })

      if (currentFilters.status) params.set('status', currentFilters.status)
      if (currentFilters.priority) params.set('priority', currentFilters.priority)

      const response = await fetch(`/api/admin/tickets?${params}`)
      const data = await response.json()

      setTickets(data.tickets)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: 'status' | 'priority', value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? '' : value }
    setFilters(newFilters)
    fetchTickets(1, newFilters)
  }

  const handlePageChange = (newPage: number) => {
    fetchTickets(newPage)
  }

  return (
    <div className={styles.page}>
      {/* Filters */}
      <div className={styles.filterBar}>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.priority || 'all'}
          onValueChange={(value) => handleFilterChange('priority', value)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className={styles.emptyCell}>
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <div>
                      <div className={styles.cellPrimary}>
                        #{ticket.ticketNumber}
                      </div>
                      <div className={`${styles.cellSecondary} ${styles.cellTruncate}`}>
                        {ticket.subject}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className={styles.cellSecondary}>
                        {ticket.user?.name || 'Unknown'}
                      </div>
                      <div className={styles.cellMono}>
                        {ticket.userEmail}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass[ticket.status]}>
                      {ticket.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityBadgeClass[ticket.priority]}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ticket.assignedTo ? (
                      <span className={styles.cellSecondary}>
                        {ticket.assignedTo.name || ticket.assignedTo.email}
                      </span>
                    ) : (
                      <span className={styles.cellSecondary}>Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className={styles.cellSecondary}>
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/tickets/${ticket.id}`}>
                        <MessageSquare className="h-4 w-4" />
                        <span className="ml-1">{ticket._count.messages}</span>
                      </Link>
                    </Button>
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
          {pagination.total} tickets
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
