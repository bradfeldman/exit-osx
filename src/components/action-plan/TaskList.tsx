'use client'

import { useState } from 'react'
import { motion } from '@/lib/motion'
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  XCircle,
  Loader2,
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string
  doneDefinition: string
  delegateTo?: string
  estimatedEffort?: string
  whyThisMatters?: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_APPLICABLE'
}

interface TaskListProps {
  tasks: Task[]
  onTaskUpdate: () => void
}

export function TaskList({ tasks, onTaskUpdate }: TaskListProps) {
  return (
    <div className="space-y-4">
      {tasks.map((task, index) => (
        <TaskCard
          key={task.id}
          task={task}
          index={index}
          onUpdate={onTaskUpdate}
        />
      ))}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  index: number
  onUpdate: () => void
}

function TaskCard({ task, index, onUpdate }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showNAModal, setShowNAModal] = useState(false)
  const [naReason, setNaReason] = useState('')

  const handleStatusChange = async (
    newStatus: 'IN_PROGRESS' | 'COMPLETED' | 'NOT_APPLICABLE',
    reason?: string
  ) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notApplicableReason: reason,
        }),
      })

      if (!response.ok) throw new Error('Failed to update task')
      onUpdate()
    } catch (error) {
      console.error('Error updating task:', error)
    } finally {
      setUpdating(false)
      setShowNAModal(false)
    }
  }

  const getStatusIcon = () => {
    switch (task.status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'NOT_APPLICABLE':
        return <XCircle className="w-5 h-5 text-muted-foreground" />
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />
    }
  }

  const isCompleted = task.status === 'COMPLETED' || task.status === 'NOT_APPLICABLE'

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-card border rounded-xl overflow-hidden transition-all ${
          isCompleted ? 'border-border/50 opacity-75' : 'border-border'
        }`}
      >
        {/* Main row */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            <button
              onClick={() => {
                if (task.status === 'NOT_STARTED') {
                  handleStatusChange('IN_PROGRESS')
                } else if (task.status === 'IN_PROGRESS') {
                  handleStatusChange('COMPLETED')
                }
              }}
              disabled={updating || isCompleted}
              className="mt-0.5 flex-shrink-0"
            >
              {updating ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              ) : (
                getStatusIcon()
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className={`font-medium ${
                    isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}>
                    {task.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                </div>

                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                >
                  {expanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-4 mt-3 text-sm">
                {task.delegateTo && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    {task.delegateTo}
                  </span>
                )}
                {task.estimatedEffort && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {task.estimatedEffort}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="border-t border-border bg-muted/30"
          >
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-1">
                  Done Definition
                </h4>
                <p className="text-sm text-muted-foreground">
                  {task.doneDefinition}
                </p>
              </div>

              {task.whyThisMatters && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">
                    Why This Matters
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {task.whyThisMatters}
                  </p>
                </div>
              )}

              {!isCompleted && (
                <div className="flex items-center gap-2 pt-2">
                  {task.status === 'NOT_STARTED' && (
                    <button
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                      disabled={updating}
                      className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Start Task
                    </button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleStatusChange('COMPLETED')}
                      disabled={updating}
                      className="px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                  <button
                    onClick={() => setShowNAModal(true)}
                    disabled={updating}
                    className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
                  >
                    Not Applicable
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* N/A Modal */}
      {showNAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Mark as Not Applicable
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Please briefly explain why this task doesn&apos;t apply to your business.
            </p>
            <textarea
              value={naReason}
              onChange={(e) => setNaReason(e.target.value)}
              placeholder="e.g., We don't use this technology..."
              className="w-full h-24 px-3 py-2 bg-background border border-input rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowNAModal(false)
                  setNaReason('')
                }}
                className="px-4 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange('NOT_APPLICABLE', naReason)}
                disabled={!naReason.trim() || updating}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
