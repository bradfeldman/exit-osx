'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
}

interface TaskCardProps {
  task: Task
  onStatusChange: (taskId: string, status: string) => void
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

const EFFORT_LABELS: Record<string, string> = {
  MINIMAL: 'Quick Win',
  LOW: 'Low Effort',
  MODERATE: 'Moderate',
  HIGH: 'Significant',
  MAJOR: 'Major Project',
}

const EFFORT_COLORS: Record<string, string> = {
  MINIMAL: 'bg-green-100 text-green-700',
  LOW: 'bg-green-50 text-green-600',
  MODERATE: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MAJOR: 'bg-red-100 text-red-700',
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

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num)
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    await onStatusChange(task.id, newStatus)
    setIsUpdating(false)
  }

  const statusBorder = {
    PENDING: 'border-l-gray-300',
    IN_PROGRESS: 'border-l-blue-500',
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
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${EFFORT_COLORS[task.effortLevel] || 'bg-gray-100 text-gray-700'}`}>
                    {EFFORT_LABELS[task.effortLevel] || task.effortLevel}
                  </span>
                  {task.estimatedHours && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                      ~{task.estimatedHours}h
                    </span>
                  )}
                </div>
              </div>

              {/* Value */}
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-green-600">
                  +{formatCurrency(task.rawImpact)}
                </p>
                <p className="text-xs text-gray-500">potential value</p>
              </div>
            </div>

            {/* Expandable Description */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800"
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
    </Card>
  )
}
