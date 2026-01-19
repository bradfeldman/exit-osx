'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaskCard } from './TaskCard'
import { TaskAssignDialog } from './TaskAssignDialog'

interface TaskUser {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface TaskInvite {
  id: string
  email: string
  isPrimary: boolean
  createdAt: string
}

interface ProofDocument {
  id: string
  fileName: string | null
  filePath: string | null
  status: string
}

interface Task {
  id: string
  title: string
  description: string
  actionType: string
  briCategory: string
  rawImpact: string
  normalizedValue: string
  effortLevel: string
  complexity: string
  estimatedHours: number | null
  status: string
  issueTier?: string | null
  dueDate?: string | null
  completionNotes?: string | null
  primaryAssignee?: TaskUser | null
  assignments?: Array<{ user: TaskUser }> | null
  invites?: TaskInvite[] | null
  proofDocuments?: ProofDocument[] | null
}

interface Stats {
  total: number
  pending: number
  inProgress: number
  completed: number
  totalValue: number
  completedValue: number
}

interface PlaybookContentProps {
  companyId: string
  companyName: string
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial Health',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operations',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const STATUS_FILTERS = [
  { value: '', label: 'All Tasks' },
  { value: 'PENDING', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
]

export function PlaybookContent({ companyId, companyName }: PlaybookContentProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<Task | null>(null)

  const loadTasks = async () => {
    try {
      const params = new URLSearchParams({ companyId })
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('category', categoryFilter)

      const response = await fetch(`/api/tasks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch tasks')

      const data = await response.json()
      setTasks(data.tasks || [])
      setStats(data.stats || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, statusFilter, categoryFilter])

  const handleStatusChange = async (taskId: string, newStatus: string, extra?: { blockedReason?: string }) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(extra?.blockedReason && { blockedReason: extra.blockedReason }),
        }),
      })

      if (!response.ok) throw new Error('Failed to update task')

      // Reload tasks to get updated stats
      await loadTasks()
    } catch (err) {
      console.error('Error updating task:', err)
    }
  }

  const handleAssign = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      setSelectedTaskForAssign(task)
      setAssignDialogOpen(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading your playbook...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Action Playbook</h1>
        <p className="text-gray-600">{companyName}</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <div className="flex gap-2">
                {STATUS_FILTERS.map(filter => (
                  <Button
                    key={filter.value}
                    variant={statusFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                    {filter.value === 'PENDING' && stats && ` (${stats.pending})`}
                    {filter.value === 'IN_PROGRESS' && stats && ` (${stats.inProgress})`}
                    {filter.value === 'COMPLETED' && stats && ` (${stats.completed})`}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={categoryFilter === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter('')}
                >
                  All
                </Button>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <Button
                    key={value}
                    variant={categoryFilter === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {statusFilter || categoryFilter
                ? 'No tasks match your filters'
                : 'No tasks have been generated yet. Complete the BRI assessment first.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onAssign={handleAssign}
              onTaskUpdate={loadTasks}
            />
          ))}
        </div>
      )}

      {/* Assignment Dialog */}
      {selectedTaskForAssign && (
        <TaskAssignDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          taskId={selectedTaskForAssign.id}
          taskTitle={selectedTaskForAssign.title}
          companyId={companyId}
          currentAssigneeId={selectedTaskForAssign.primaryAssignee?.id}
          currentDueDate={selectedTaskForAssign.dueDate}
          onSave={loadTasks}
        />
      )}
    </div>
  )
}
