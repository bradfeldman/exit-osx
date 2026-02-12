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
import { Input } from '@/components/ui/input'
import { Search, ChevronLeft, ChevronRight, Building2 } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  createdAt: string
  _count: {
    members: number
    companies: number
  }
}

interface WorkspaceTableProps {
  initialWorkspaces: Workspace[]
  initialPagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function WorkspaceTable({ initialWorkspaces, initialPagination }: WorkspaceTableProps) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchWorkspaces = async (page: number, searchQuery: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      })
      if (searchQuery) {
        params.set('search', searchQuery)
      }

      const response = await fetch(`/api/admin/workspaces?${params}`)
      const data = await response.json()

      setWorkspaces(data.workspaces)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch workspaces:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchWorkspaces(1, search)
  }

  const handlePageChange = (newPage: number) => {
    fetchWorkspaces(newPage, search)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by workspace name..."
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
              <TableHead>Workspace</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Companies</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No workspaces found
                </TableCell>
              </TableRow>
            ) : (
              workspaces.map((ws) => (
                <TableRow key={ws.id}>
                  <TableCell>
                    <div className="font-medium">{ws.name}</div>
                  </TableCell>
                  <TableCell>{ws._count.members}</TableCell>
                  <TableCell>{ws._count.companies}</TableCell>
                  <TableCell>
                    {new Date(ws.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/workspaces/${ws.id}`}>
                        <Building2 className="h-4 w-4" />
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} workspaces
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
