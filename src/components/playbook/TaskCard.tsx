'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TaskCompletionDialog } from './TaskCompletionDialog'
import { FileText } from 'lucide-react'

interface ProofDocument {
  id: string
  fileName: string | null
  fileUrl: string | null
  status: string
}

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

interface TaskCardProps {
  task: Task
  onStatusChange: (taskId: string, status: string) => void
  onAssign?: (taskId: string) => void
  showAssignment?: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transfer',
  OPERATIONAL: 'Operations',
  MARKET: 'Market',
  LEGAL_TAX: 'Legal/Tax',
  PERSONAL: 'Personal',
}

const CATEGORY_COLORS: Record<string, string> = {
  FINANCIAL: 'bg-blue-100 text-blue-700',
  TRANSFERABILITY: 'bg-green-100 text-green-700',
  OPERATIONAL: 'bg-yellow-100 text-yellow-700',
  MARKET: 'bg-purple-100 text-purple-700',
  LEGAL_TAX: 'bg-red-100 text-red-700',
  PERSONAL: 'bg-orange-100 text-orange-700',
}

function getEffortLevel(effort: string): string {
  switch (effort) {
    case 'MINIMAL':
    case 'LOW':
      return 'Low Effort'
    case 'MODERATE':
      return 'Mid Effort'
    case 'HIGH':
    case 'MAJOR':
      return 'High Effort'
    default:
      return 'Mid Effort'
  }
}

function getImpactLevel(issueTier: string | null | undefined): string {
  switch (issueTier) {
    case 'CRITICAL':
      return 'Critical'
    case 'SIGNIFICANT':
      return 'Significant'
    case 'OPTIMIZATION':
    default:
      return 'Optimization'
  }
}

function getImpactEffortColor(effort: string, issueTier: string | null | undefined): string {
  const isLowEffort = effort === 'MINIMAL' || effort === 'LOW'
  const isHighEffort = effort === 'HIGH' || effort === 'MAJOR'

  // Critical issues always get red tones
  if (issueTier === 'CRITICAL') {
    if (isLowEffort) return 'bg-red-100 text-red-700' // Quick win on critical issue
    return 'bg-red-50 text-red-600'
  }

  // Significant issues get orange/yellow tones
  if (issueTier === 'SIGNIFICANT') {
    if (isLowEffort) return 'bg-orange-100 text-orange-700' // Quick win on significant issue
    return 'bg-yellow-100 text-yellow-700'
  }

  // Optimization issues get blue/green tones
  if (isLowEffort) return 'bg-green-100 text-green-700'
  if (isHighEffort) return 'bg-gray-100 text-gray-600'
  return 'bg-blue-100 text-blue-700'
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  TYPE_I_EVIDENCE: 'Gather Evidence',
  TYPE_II_DOCUMENTATION: 'Document',
  TYPE_III_OPERATIONAL: 'Improve Operations',
  TYPE_IV_INSTITUTIONALIZE: 'Institutionalize',
  TYPE_V_RISK_REDUCTION: 'Reduce Risk',
  TYPE_VI_ALIGNMENT: 'Align Stakeholders',
  TYPE_VII_READINESS: 'Prepare for Exit',
  TYPE_VIII_SIGNALING: 'Signal to Market',
  TYPE_IX_OPTIONS: 'Create Options',
  TYPE_X_DEFER: 'Defer',
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return email[0].toUpperCase()
}

function formatDueDate(dateStr: string): { text: string; className: string } {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (diffDays < 0) {
    return { text: `Overdue (${formatted})`, className: 'text-red-600' }
  } else if (diffDays === 0) {
    return { text: 'Due today', className: 'text-orange-600' }
  } else if (diffDays <= 3) {
    return { text: `Due ${formatted}`, className: 'text-yellow-600' }
  }
  return { text: `Due ${formatted}`, className: 'text-gray-500' }
}

export function TaskCard({ task, onStatusChange, onAssign, showAssignment = true }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    // Show completion dialog when completing a task
    if (newStatus === 'COMPLETED' && task.status !== 'COMPLETED') {
      setShowCompletionDialog(true)
      return
    }
    setIsUpdating(true)
    await onStatusChange(task.id, newStatus)
    setIsUpdating(false)
  }

  const handleComplete = async (taskId: string, completionNotes?: string) => {
    setIsUpdating(true)
    // Pass completion notes via the onStatusChange handler
    // The parent component should handle this
    await onStatusChange(taskId, 'COMPLETED')
    setIsUpdating(false)
  }

  const statusBorder = {
    PENDING: 'border-l-gray-300',
    IN_PROGRESS: 'border-l-primary',
    COMPLETED: 'border-l-green-500',
    DEFERRED: 'border-l-yellow-500',
    BLOCKED: 'border-l-red-500',
    CANCELLED: 'border-l-gray-400',
  }[task.status] || 'border-l-gray-300'

  return (
    <Card className={`border-l-4 ${statusBorder} ${task.status === 'COMPLETED' ? 'opacity-75' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            onClick={() => handleStatusChange(task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}
            disabled={isUpdating}
            className={`flex-shrink-0 w-6 h-6 mt-0.5 rounded border-2 transition-colors ${
              task.status === 'COMPLETED'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-green-500'
            } ${isUpdating ? 'opacity-50' : ''}`}
          >
            {task.status === 'COMPLETED' && (
              <svg className="w-full h-full p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={`font-medium text-gray-900 ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''}`}>
                  {task.title}
                </h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${CATEGORY_COLORS[task.briCategory] || 'bg-gray-100 text-gray-700'}`}>
                    {CATEGORY_LABELS[task.briCategory] || task.briCategory}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getImpactEffortColor(task.effortLevel, task.issueTier)}`}>
                    {getImpactLevel(task.issueTier)} / {getEffortLevel(task.effortLevel)}
                  </span>
                </div>
              </div>

              {/* Assignment & Due Date - Right side */}
              {showAssignment && (
                <div className="flex flex-col items-end gap-2 text-sm">
                  {/* Due Date */}
                  {task.dueDate && (
                    <div className={`flex items-center gap-1 ${formatDueDate(task.dueDate).className}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">{formatDueDate(task.dueDate).text}</span>
                    </div>
                  )}

                  {/* Primary Assignee */}
                  {task.primaryAssignee ? (
                    <div className="flex items-center gap-2" title={task.primaryAssignee.email}>
                      {task.primaryAssignee.avatarUrl ? (
                        <img
                          src={task.primaryAssignee.avatarUrl}
                          alt={task.primaryAssignee.name || task.primaryAssignee.email}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                          {getInitials(task.primaryAssignee.name, task.primaryAssignee.email)}
                        </div>
                      )}
                      <span className="text-xs text-gray-600 max-w-24 truncate">
                        {task.primaryAssignee.name || task.primaryAssignee.email.split('@')[0]}
                      </span>
                    </div>
                  ) : task.invites && task.invites.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-yellow-600" title="Pending invite">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Invite pending</span>
                    </div>
                  ) : onAssign ? (
                    <button
                      onClick={() => onAssign(task.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      <span>Assign</span>
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {/* Expandable Description */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 text-sm text-primary hover:text-primary/80"
            >
              {isExpanded ? 'Show less' : 'Show details'}
            </button>

            {isExpanded && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{task.description}</p>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Type: {ACTION_TYPE_LABELS[task.actionType] || task.actionType}</span>
                  <span>Complexity: {task.complexity}</span>
                </div>

                {/* Proof Documents for Completed Tasks */}
                {task.status === 'COMPLETED' && task.proofDocuments && task.proofDocuments.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-2">Proof of Completion</p>
                    <div className="space-y-1">
                      {task.proofDocuments.map(doc => (
                        <a
                          key={doc.id}
                          href={doc.fileUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="underline">{doc.fileName || 'View document'}</span>
                        </a>
                      ))}
                    </div>
                    {task.completionNotes && (
                      <p className="mt-2 text-xs text-gray-600 italic">
                        Notes: {task.completionNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Status Actions */}
                {task.status !== 'COMPLETED' && (
                  <div className="mt-4 flex gap-2">
                    {task.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('IN_PROGRESS')}
                        disabled={isUpdating}
                      >
                        Start Working
                      </Button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange('COMPLETED')}
                          disabled={isUpdating}
                        >
                          Mark Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange('PENDING')}
                          disabled={isUpdating}
                        >
                          Move to To Do
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStatusChange('DEFERRED')}
                      disabled={isUpdating}
                    >
                      Defer
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Completion Dialog */}
      <TaskCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        task={{
          id: task.id,
          title: task.title,
          actionType: task.actionType,
        }}
        onComplete={handleComplete}
      />
    </Card>
  )
}
