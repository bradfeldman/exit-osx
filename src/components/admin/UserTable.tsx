'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import styles from '@/components/admin/admin-tables.module.css'

interface User {
  id: string
  email: string
  name: string | null
  isSuperAdmin: boolean
  createdAt: string
  workspaces: Array<{
    workspace: {
      planTier: string
      subscriptionStatus: string
    }
  }>
}

interface UserTableProps {
  initialUsers: User[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const planTierConfig: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline'; badgeClass?: string }> = {
  FOUNDATION: { label: 'Foundation', variant: 'secondary' },
  GROWTH: { label: 'Growth', variant: 'default', badgeClass: styles.badgeGrowth },
  DEAL_ROOM: { label: 'Deal Room', variant: 'default', badgeClass: styles.badgeDealRoom },
}

const statusConfig: Record<string, { label: string; badgeClass: string }> = {
  ACTIVE: { label: 'Active', badgeClass: styles.badgeStatusActive },
  TRIALING: { label: 'Trial', badgeClass: styles.badgeStatusTrialing },
  PAST_DUE: { label: 'Past Due', badgeClass: styles.badgeStatusPastDue },
  CANCELLED: { label: 'Cancelled', badgeClass: styles.badgeStatusCancelled },
  EXPIRED: { label: 'Expired', badgeClass: styles.badgeStatusCancelled },
}

export function UserTable({ initialUsers, initialPagination }: UserTableProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchUsers = async (page: number, searchQuery: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()

      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(1, search)
  }

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, search)
  }

  return (
    <div className={styles.tableContainer}>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchInputWrapper}>
          <Search className={styles.searchIcon} />
          <Input
            type="search"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          Search
        </Button>
      </form>

      <div className={styles.tableWrapper}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const workspace = user.workspaces[0]?.workspace
                const tierCfg = workspace ? planTierConfig[workspace.planTier] : null
                const statusCfg = workspace ? statusConfig[workspace.subscriptionStatus] : null

                return (
                  <TableRow
                    key={user.id}
                    className={styles.clickableRow}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <TableCell>
                      <div className={styles.cellPrimary}>{user.name || 'No name'}</div>
                      <div className={styles.cellSecondary}>{user.email}</div>
                    </TableCell>
                    <TableCell>
                      {tierCfg ? (
                        <Badge variant={tierCfg.variant} className={tierCfg.badgeClass}>
                          {tierCfg.label}
                        </Badge>
                      ) : (
                        <span className={styles.cellMuted}>&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {statusCfg ? (
                        <Badge variant="default" className={statusCfg.badgeClass}>
                          {statusCfg.label}
                        </Badge>
                      ) : (
                        <span className={styles.cellMuted}>&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isSuperAdmin && (
                        <Badge variant="secondary">Super Admin</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className={styles.pagination}>
        <p className={styles.paginationInfo}>
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} users
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
