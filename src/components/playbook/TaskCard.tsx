'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { TaskCompletionDialog } from './TaskCompletionDialog'
import { TaskUploadDialog } from './TaskUploadDialog'
import { FileText, ChevronDown, ChevronRight, Target, AlertTriangle, CheckCircle2, ListChecks, FileOutput, TrendingUp, Upload } from 'lucide-react'
import { type RichTaskDescription, hasRichDescription } from '@/lib/playbook/rich-task-description'

interface ProofDocument {
  id: string
  fileName: string | null
  filePath: string | null
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
  richDescription?: RichTaskDescription | null
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
  blockedAt?: string | null
  blockedReason?: string | null
  completionNotes?: string | null
  primaryAssignee?: TaskUser | null
  assignments?: Array<{ user: TaskUser }> | null
  invites?: TaskInvite[] | null
  proofDocuments?: ProofDocument[] | null
}

interface TaskCardProps {
  task: Task
  onStatusChange: (taskId: string, status: string, extra?: { blockedReason?: string }) => void
  onAssign?: (taskId: string) => void
  onTaskUpdate?: () => void  // Called when task data changes (e.g., after upload)
  showAssignment?: boolean
  defaultExpanded?: boolean
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

/**
 * Collapsible section for rich description content
 */
function RichDescriptionSection({
  title,
  icon: Icon,
  iconColor,
  children,
  defaultOpen = false
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
        <span className="font-medium text-gray-900 flex-1">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Rich description view component
 */
function RichDescriptionView({ richDescription }: { richDescription: RichTaskDescription }) {
  return (
    <div className="space-y-3">
      {/* Why This Applies */}
      <RichDescriptionSection
        title="Why This Applies to Your Business"
        icon={Target}
        iconColor="text-blue-600"
        defaultOpen={true}
      >
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {richDescription.whyThisApplies}
        </p>
      </RichDescriptionSection>

      {/* Buyer Risk */}
      <RichDescriptionSection
        title="Why This Is a Buyer Risk"
        icon={AlertTriangle}
        iconColor="text-amber-600"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700 font-medium italic">
            &quot;{richDescription.buyerRisk.mainQuestion}&quot;
          </p>
          <p className="text-sm text-gray-600">If the answer is unclear, buyers price in risk by:</p>
          <ul className="list-disc pl-5 space-y-1">
            {richDescription.buyerRisk.consequences.map((consequence, i) => (
              <li key={i} className="text-sm text-gray-700">{consequence}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-700 mt-2">{richDescription.buyerRisk.conclusion}</p>
        </div>
      </RichDescriptionSection>

      {/* Success Criteria */}
      <RichDescriptionSection
        title="What Success Looks Like"
        icon={CheckCircle2}
        iconColor="text-green-600"
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-700">{richDescription.successCriteria.overview}</p>
          <ul className="list-disc pl-5 space-y-1">
            {richDescription.successCriteria.outcomes.map((outcome, i) => (
              <li key={i} className="text-sm text-gray-700">{outcome}</li>
            ))}
          </ul>
        </div>
      </RichDescriptionSection>

      {/* Sub-Tasks */}
      <RichDescriptionSection
        title="What Should Be Addressed"
        icon={ListChecks}
        iconColor="text-purple-600"
      >
        <div className="space-y-4">
          {richDescription.subTasks.map((subTask, i) => (
            <div key={i}>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {i + 1}. {subTask.title}
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                {subTask.items.map((item, j) => (
                  <li key={j} className="text-sm text-gray-700">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </RichDescriptionSection>

      {/* Output Format */}
      <RichDescriptionSection
        title="Required Output Format"
        icon={FileOutput}
        iconColor="text-indigo-600"
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-700">{richDescription.outputFormat.description}</p>
          <ul className="list-disc pl-5 space-y-1">
            {richDescription.outputFormat.formats.map((format, i) => (
              <li key={i} className="text-sm text-gray-700">{format}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-600 italic mt-2">{richDescription.outputFormat.guidance}</p>
        </div>
      </RichDescriptionSection>

      {/* Exit Impact */}
      <RichDescriptionSection
        title="How This Impacts Exit Outcomes"
        icon={TrendingUp}
        iconColor="text-emerald-600"
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-700">{richDescription.exitImpact.overview}</p>
          <ul className="list-disc pl-5 space-y-1">
            {richDescription.exitImpact.benefits.map((benefit, i) => (
              <li key={i} className="text-sm text-gray-700">{benefit}</li>
            ))}
          </ul>
        </div>
      </RichDescriptionSection>
    </div>
  )
}

export function TaskCard({ task, onStatusChange, onAssign, onTaskUpdate, showAssignment = true, defaultExpanded = false }: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [showBlockedDialog, setShowBlockedDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [blockedReason, setBlockedReason] = useState('')

  const handleStatusChange = async (newStatus: string) => {
    // Show completion dialog when completing a task
    if (newStatus === 'COMPLETED' && task.status !== 'COMPLETED') {
      setShowCompletionDialog(true)
      return
    }
    // Show blocked dialog when blocking a task
    if (newStatus === 'BLOCKED' && task.status !== 'BLOCKED') {
      setShowBlockedDialog(true)
      return
    }
    setIsUpdating(true)
    await onStatusChange(task.id, newStatus)
    setIsUpdating(false)
  }

  const handleBlocked = async () => {
    if (!blockedReason.trim()) return
    setIsUpdating(true)
    await onStatusChange(task.id, 'BLOCKED', { blockedReason: blockedReason.trim() })
    setShowBlockedDialog(false)
    setBlockedReason('')
    setIsUpdating(false)
  }

  const handleComplete = async (taskId: string, _completionNotes?: string) => {
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
                  {task.status === 'BLOCKED' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Blocked
                    </span>
                  )}
                </div>

                {/* Mobile: Assignment & Due Date - shown below tags on small screens */}
                {showAssignment && (
                  <div className="flex sm:hidden flex-wrap items-center gap-3 mt-3 text-sm">
                    {/* Due Date */}
                    {task.dueDate && (
                      <div className={`flex items-center gap-1 ${formatDueDate(task.dueDate).className}`}>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs">{formatDueDate(task.dueDate).text}</span>
                      </div>
                    )}

                    {/* Primary Assignee */}
                    {task.primaryAssignee ? (
                      <div className="flex items-center gap-1.5" title={task.primaryAssignee.email}>
                        {task.primaryAssignee.avatarUrl ? (
                          <img
                            src={task.primaryAssignee.avatarUrl}
                            alt={task.primaryAssignee.name || task.primaryAssignee.email}
                            className="w-5 h-5 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-medium flex-shrink-0">
                            {getInitials(task.primaryAssignee.name, task.primaryAssignee.email)}
                          </div>
                        )}
                        <span className="text-xs text-gray-600">
                          {task.primaryAssignee.name || task.primaryAssignee.email.split('@')[0]}
                        </span>
                      </div>
                    ) : task.invites && task.invites.length > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-yellow-600" title="Pending invite">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Invite pending</span>
                      </div>
                    ) : onAssign ? (
                      <button
                        onClick={() => onAssign(task.id)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors"
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span>Assign</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Assignment & Due Date - Right side (hidden on mobile, shown below title) */}
              {showAssignment && (
                <div className="hidden sm:flex flex-col items-end gap-2 text-sm flex-shrink-0">
                  {/* Due Date */}
                  {task.dueDate && (
                    <div className={`flex items-center gap-1 whitespace-nowrap ${formatDueDate(task.dueDate).className}`}>
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                          className="w-6 h-6 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium flex-shrink-0">
                          {getInitials(task.primaryAssignee.name, task.primaryAssignee.email)}
                        </div>
                      )}
                      <span className="text-xs text-gray-600 truncate max-w-[120px]">
                        {task.primaryAssignee.name || task.primaryAssignee.email.split('@')[0]}
                      </span>
                    </div>
                  ) : task.invites && task.invites.length > 0 ? (
                    <div className="flex items-center gap-1 text-xs text-yellow-600 whitespace-nowrap" title="Pending invite">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Invite pending</span>
                    </div>
                  ) : onAssign ? (
                    <button
                      onClick={() => onAssign(task.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="mt-3">
                {/* Rich Description Display */}
                {hasRichDescription(task.richDescription) ? (
                  <RichDescriptionView richDescription={task.richDescription} />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{task.description}</p>
                  </div>
                )}

                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Type: {ACTION_TYPE_LABELS[task.actionType] || task.actionType}</span>
                    <span>Complexity: {task.complexity}</span>
                  </div>

                  {/* Blocked Reason Display */}
                  {task.status === 'BLOCKED' && task.blockedReason && (
                    <div className="mt-4 p-3 bg-red-50 rounded border border-red-200">
                      <p className="text-xs font-medium text-red-700 mb-1">Blocked Reason</p>
                      <p className="text-sm text-red-800">{task.blockedReason}</p>
                      {task.blockedAt && (
                        <p className="text-xs text-red-600 mt-1">
                          Blocked on {new Date(task.blockedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Upload Proof Document */}
                  {task.status !== 'COMPLETED' && (
                    <div className="mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowUploadDialog(true)}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Document
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        Upload supporting documents for this task
                      </p>
                    </div>
                  )}

                  {/* Uploaded Proof Documents */}
                  {task.proofDocuments && task.proofDocuments.length > 0 && (
                    <div className={`mt-4 p-3 rounded border ${
                      task.status === 'COMPLETED'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <p className={`text-xs font-medium mb-2 ${
                        task.status === 'COMPLETED' ? 'text-green-700' : 'text-blue-700'
                      }`}>
                        {task.status === 'COMPLETED' ? 'Proof of Completion' : 'Uploaded Documents'}
                      </p>
                      <div className="space-y-1">
                        {task.proofDocuments.map(doc => (
                          <button
                            key={doc.id}
                            onClick={async () => {
                              // Fetch signed URL and open in new tab
                              try {
                                const response = await fetch(`/api/tasks/${task.id}/proof`)
                                if (response.ok) {
                                  const data = await response.json()
                                  const docWithUrl = data.proofDocuments?.find((d: { id: string; signedUrl?: string }) => d.id === doc.id)
                                  if (docWithUrl?.signedUrl) {
                                    window.open(docWithUrl.signedUrl, '_blank')
                                  }
                                }
                              } catch (err) {
                                console.error('Error fetching document URL:', err)
                              }
                            }}
                            className={`flex items-center gap-2 text-sm hover:opacity-80 ${
                              task.status === 'COMPLETED' ? 'text-green-700' : 'text-blue-700'
                            }`}
                          >
                            <FileText className="h-4 w-4" />
                            <span className="underline">{doc.fileName || 'View document'}</span>
                          </button>
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      {task.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange('IN_PROGRESS')}
                          disabled={isUpdating}
                        >
                          Start Working
                        </Button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange('COMPLETED')}
                          disabled={isUpdating}
                        >
                          Mark Complete
                        </Button>
                      )}
                      {task.status === 'BLOCKED' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange('IN_PROGRESS')}
                          disabled={isUpdating}
                        >
                          Resume Working
                        </Button>
                      )}
                      {(task.status === 'IN_PROGRESS' || task.status === 'PENDING') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleStatusChange('BLOCKED')}
                          disabled={isUpdating}
                        >
                          Mark Blocked
                        </Button>
                      )}
                      {onAssign && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAssign(task.id)}
                          disabled={isUpdating}
                        >
                          Re-assign
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatusChange('DEFERRED')}
                        disabled={isUpdating}
                      >
                        Defer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => handleStatusChange('NOT_APPLICABLE')}
                        disabled={isUpdating}
                      >
                        Not Applicable
                      </Button>
                    </div>
                  )}
                </div>
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

      {/* Blocked Reason Dialog */}
      <Dialog open={showBlockedDialog} onOpenChange={setShowBlockedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Task as Blocked</DialogTitle>
            <DialogDescription>
              Please explain why this task is blocked. This will be visible to managers and team leads.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="What's preventing you from completing this task? (e.g., waiting on client response, missing information, dependency on another task...)"
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBlockedDialog(false)
                setBlockedReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlocked}
              disabled={!blockedReason.trim() || isUpdating}
              className="bg-red-600 hover:bg-red-700"
            >
              {isUpdating ? 'Saving...' : 'Mark as Blocked'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <TaskUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        task={{
          id: task.id,
          title: task.title,
          actionType: task.actionType,
        }}
        onUploadComplete={onTaskUpdate}
      />
    </Card>
  )
}
