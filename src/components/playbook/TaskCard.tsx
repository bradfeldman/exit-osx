'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { analytics } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { TaskCompletionDialog } from './TaskCompletionDialog'
import { TaskUploadDialog } from './TaskUploadDialog'
import {
  FileText, ChevronDown, Target, AlertTriangle, CheckCircle2,
  ListChecks, FileOutput, TrendingUp, Check, Clock,
  AlertCircle, Zap, Paperclip, Circle, Ban, CalendarClock,
  XCircle, Play, UserCircle2
} from 'lucide-react'
import { type RichTaskDescription, hasRichDescription } from '@/lib/playbook/rich-task-description'
import { getBRICategoryLabel, getBRICategoryColor } from '@/lib/constants/bri-categories'
import { cn } from '@/lib/utils'

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
  onStatusChange: (taskId: string, status: string, extra?: { blockedReason?: string; completionNotes?: string }) => void
  onAssign?: (taskId: string) => void
  onTaskUpdate?: () => void
  showAssignment?: boolean
  defaultExpanded?: boolean
}

// Status configuration
const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Not Started', icon: Circle, color: 'text-slate-500', bg: 'bg-slate-100', activeBg: 'bg-slate-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: Play, color: 'text-blue-600', bg: 'bg-blue-100', activeBg: 'bg-blue-500' },
  { value: 'BLOCKED', label: 'Blocked', icon: Ban, color: 'text-amber-600', bg: 'bg-amber-100', activeBg: 'bg-amber-500' },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', activeBg: 'bg-emerald-500' },
] as const

const PLANNING_OPTIONS = [
  { value: 'DEFERRED', label: 'Defer Task', icon: CalendarClock, color: 'text-slate-500' },
  { value: 'NOT_APPLICABLE', label: 'Not Applicable', icon: XCircle, color: 'text-slate-400' },
] as const

// Impact indicator
function getImpactConfig(issueTier: string | null | undefined) {
  switch (issueTier) {
    case 'CRITICAL':
      return { label: 'Critical', color: 'text-rose-600', dotColor: 'bg-rose-500' }
    case 'SIGNIFICANT':
      return { label: 'High Impact', color: 'text-amber-600', dotColor: 'bg-amber-500' }
    default:
      return { label: 'Optimization', color: 'text-sky-600', dotColor: 'bg-sky-500' }
  }
}

// Effort indicator
function getEffortConfig(effort: string) {
  switch (effort) {
    case 'MINIMAL':
    case 'LOW':
      return { label: 'Quick', color: 'text-emerald-600' }
    case 'MODERATE':
      return { label: 'Medium', color: 'text-blue-600' }
    case 'HIGH':
    case 'MAJOR':
      return { label: 'Major', color: 'text-purple-600' }
    default:
      return { label: 'Medium', color: 'text-blue-600' }
  }
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

function formatDueDate(dateStr: string): { text: string; isOverdue: boolean; isUrgent: boolean } {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  if (diffDays < 0) {
    return { text: 'Overdue', isOverdue: true, isUrgent: false }
  } else if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false, isUrgent: true }
  } else if (diffDays <= 3) {
    return { text: `Due ${formatted}`, isOverdue: false, isUrgent: true }
  }
  return { text: `Due ${formatted}`, isOverdue: false, isUrgent: false }
}

/**
 * Rich description section - collapsible content
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
    <div className="border border-border/50 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", iconColor)} />
        <span className="text-sm font-medium text-foreground flex-1">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/30 text-sm border-t border-border/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Rich description view component
 */
function RichDescriptionView({ richDescription }: { richDescription: RichTaskDescription }) {
  return (
    <div className="space-y-2">
      <RichDescriptionSection
        title="Why This Applies"
        icon={Target}
        iconColor="text-blue-500"
        defaultOpen={true}
      >
        <p className="text-foreground/80 whitespace-pre-line leading-relaxed">
          {richDescription.whyThisApplies}
        </p>
      </RichDescriptionSection>

      <RichDescriptionSection
        title="Buyer Risk"
        icon={AlertTriangle}
        iconColor="text-amber-500"
      >
        <div className="space-y-3">
          <p className="text-foreground font-medium italic">
            &quot;{richDescription.buyerRisk.mainQuestion}&quot;
          </p>
          <p className="text-muted-foreground">If unclear, buyers may:</p>
          <ul className="list-disc pl-5 space-y-1">
            {richDescription.buyerRisk.consequences.map((consequence, i) => (
              <li key={i} className="text-foreground/80">{consequence}</li>
            ))}
          </ul>
          <p className="text-foreground/80 mt-2">{richDescription.buyerRisk.conclusion}</p>
        </div>
      </RichDescriptionSection>

      <RichDescriptionSection
        title="Success Criteria"
        icon={CheckCircle2}
        iconColor="text-emerald-500"
      >
        <div className="space-y-2">
          <p className="text-foreground/80">{richDescription.successCriteria.overview}</p>
          <ul className="list-disc pl-5 space-y-1">
            {richDescription.successCriteria.outcomes.map((outcome, i) => (
              <li key={i} className="text-foreground/80">{outcome}</li>
            ))}
          </ul>
        </div>
      </RichDescriptionSection>

      <RichDescriptionSection
        title="Steps to Complete"
        icon={ListChecks}
        iconColor="text-purple-500"
      >
        <div className="space-y-4">
          {richDescription.subTasks.map((subTask, i) => (
            <div key={i}>
              <h4 className="font-semibold text-foreground mb-2">
                {i + 1}. {subTask.title}
              </h4>
              <ul className="list-disc pl-5 space-y-1">
                {subTask.items.map((item, j) => (
                  <li key={j} className="text-foreground/80">{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </RichDescriptionSection>

      <RichDescriptionSection
        title="Required Output"
        icon={FileOutput}
        iconColor="text-indigo-500"
      >
        <div className="space-y-2">
          <p className="text-foreground/80">{richDescription.outputFormat.description}</p>
          <ul className="list-disc pl-5 space-y-1">
            {richDescription.outputFormat.formats.map((format, i) => (
              <li key={i} className="text-foreground/80">{format}</li>
            ))}
          </ul>
          <p className="text-muted-foreground italic mt-2">{richDescription.outputFormat.guidance}</p>
        </div>
      </RichDescriptionSection>

      <RichDescriptionSection
        title="Exit Impact"
        icon={TrendingUp}
        iconColor="text-emerald-500"
      >
        <div className="space-y-2">
          <p className="text-foreground/80">{richDescription.exitImpact.overview}</p>
          <ul className="list-disc pl-5 space-y-1">
            {richDescription.exitImpact.benefits.map((benefit, i) => (
              <li key={i} className="text-foreground/80">{benefit}</li>
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

  // Track if we've already tracked the expand for this task
  const hasTrackedExpand = useRef(false)

  const impactConfig = getImpactConfig(task.issueTier)
  const effortConfig = getEffortConfig(task.effortLevel)
  const isCompleted = task.status === 'COMPLETED'
  const isBlocked = task.status === 'BLOCKED'
  const isDeferred = task.status === 'DEFERRED'
  const isNotApplicable = task.status === 'NOT_APPLICABLE'
  const hasDocuments = task.proofDocuments && task.proofDocuments.length > 0

  const currentStatus = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[0]

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === task.status) return

    if (newStatus === 'COMPLETED') {
      setShowCompletionDialog(true)
      return
    }
    if (newStatus === 'BLOCKED') {
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

  const handleComplete = async (taskId: string, completionNotes?: string) => {
    setIsUpdating(true)
    await onStatusChange(taskId, 'COMPLETED', completionNotes ? { completionNotes } : undefined)
    setIsUpdating(false)
  }

  // Handle expand/collapse with analytics tracking
  const handleToggleExpand = useCallback(() => {
    const willExpand = !isExpanded
    setIsExpanded(willExpand)

    // Only track the first time user expands this task
    if (willExpand && !hasTrackedExpand.current) {
      hasTrackedExpand.current = true
      analytics.track('task_expanded', {
        taskId: task.id,
        taskTitle: task.title,
        taskCategory: task.briCategory,
        taskPriority: task.rawImpact,
        issueTier: task.issueTier ?? null,
        effortLevel: task.effortLevel,
      })
    }
  }, [isExpanded, task.id, task.title, task.briCategory, task.rawImpact, task.issueTier, task.effortLevel])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-xl border bg-white dark:bg-slate-900 transition-all duration-200",
        isCompleted
          ? "border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-900/10 dark:to-slate-900"
          : isBlocked
            ? "border-amber-200 dark:border-amber-800/50"
            : isNotApplicable || isDeferred
              ? "border-slate-200/70 dark:border-slate-700/50 opacity-60"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md"
      )}
    >
      {/* Main Card Content */}
      <div className="p-5">
        {/* Title and Meta */}
        <div className="mb-4">
          <h3 className={cn(
            "text-base font-semibold leading-snug mb-2",
            isCompleted ? "text-emerald-800 dark:text-emerald-300" : "text-slate-900 dark:text-slate-100",
            (isNotApplicable || isDeferred) && "text-slate-500 dark:text-slate-400"
          )}>
            {task.title}
          </h3>

          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {/* Category Badge */}
            <span className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-md",
              getBRICategoryColor(task.briCategory)
            )}>
              {getBRICategoryLabel(task.briCategory, true)}
            </span>

            {/* Impact */}
            <span className={cn("flex items-center gap-1 text-xs", impactConfig.color)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", impactConfig.dotColor)} />
              {impactConfig.label}
            </span>

            {/* Effort */}
            <span className={cn("text-xs", effortConfig.color)}>
              {effortConfig.label} effort
            </span>

            {/* Due Date */}
            {task.dueDate && (
              <span className={cn(
                "flex items-center gap-1 text-xs",
                formatDueDate(task.dueDate).isOverdue
                  ? "text-rose-600 font-medium"
                  : formatDueDate(task.dueDate).isUrgent
                    ? "text-amber-600"
                    : "text-slate-500"
              )}>
                <Clock className="h-3 w-3" />
                {formatDueDate(task.dueDate).text}
              </span>
            )}

            {/* Evidence indicator */}
            {hasDocuments && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Paperclip className="h-3 w-3" />
                {task.proofDocuments!.length}
              </span>
            )}
          </div>
        </div>

        {/* Blocked Alert */}
        {isBlocked && task.blockedReason && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/50">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">{task.blockedReason}</p>
          </div>
        )}

        {/* Status Selection - THE CORE INTERACTION */}
        <div className="space-y-3">
          {/* Main Status Options */}
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => {
              const Icon = status.icon
              const isActive = task.status === status.value

              return (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value)}
                  disabled={isUpdating}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? `${status.activeBg} text-white shadow-sm`
                      : `${status.bg} ${status.color} hover:opacity-80`,
                    isUpdating && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {status.label}
                </button>
              )
            })}
          </div>

          {/* Secondary Row: Planning Options + Add Evidence + Assignee */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Planning Options */}
            {PLANNING_OPTIONS.map((option) => {
              const Icon = option.icon
              const isActive = task.status === option.value

              return (
                <button
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={isUpdating}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150",
                    isActive
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                    isUpdating && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {option.label}
                </button>
              )
            })}

            {/* Divider */}
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Add Evidence */}
            <button
              onClick={() => setShowUploadDialog(true)}
              disabled={isUpdating}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150",
                "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                isUpdating && "opacity-50 cursor-not-allowed"
              )}
            >
              <Paperclip className="h-3 w-3" />
              Add Evidence
            </button>

            {/* Assignee - Clickable */}
            {showAssignment && onAssign && (
              <>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                <button
                  onClick={() => onAssign(task.id)}
                  disabled={isUpdating}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all duration-150",
                    "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
                    isUpdating && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {task.primaryAssignee ? (
                    <>
                      {task.primaryAssignee.avatarUrl ? (
                        <img
                          src={task.primaryAssignee.avatarUrl}
                          alt=""
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] flex items-center justify-center font-medium text-slate-600 dark:text-slate-300">
                          {getInitials(task.primaryAssignee.name, task.primaryAssignee.email)}
                        </span>
                      )}
                      <span className="truncate max-w-[80px]">
                        {task.primaryAssignee.name || task.primaryAssignee.email.split('@')[0]}
                      </span>
                    </>
                  ) : task.invites && task.invites.length > 0 ? (
                    <>
                      <Clock className="h-3 w-3 text-amber-500" />
                      <span className="text-amber-600">Invite pending</span>
                    </>
                  ) : (
                    <>
                      <UserCircle2 className="h-3.5 w-3.5" />
                      <span>Unassigned</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={handleToggleExpand}
          className="mt-4 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-1"
        >
          {isExpanded ? 'Hide details' : 'Show details'}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3" />
          </motion.div>
        </button>
      </div>

      {/* Expanded Details Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
          >
            <div className="p-5 space-y-4 bg-slate-50/50 dark:bg-slate-800/30">
              {/* Rich Description or Basic Description */}
              {hasRichDescription(task.richDescription) ? (
                <RichDescriptionView richDescription={task.richDescription} />
              ) : (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{task.description}</p>
                </div>
              )}

              {/* Task Metadata */}
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Action Type</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {ACTION_TYPE_LABELS[task.actionType] || task.actionType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Complexity</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {task.complexity.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Impact</p>
                  <p className={cn("font-medium", impactConfig.color)}>
                    {impactConfig.label}
                  </p>
                </div>
              </div>

              {/* Evidence Section */}
              {hasDocuments && (
                <div className={cn(
                  "p-4 rounded-lg border",
                  isCompleted
                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-700/50"
                    : "bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-700/50"
                )}>
                  <p className={cn(
                    "text-xs font-semibold uppercase tracking-wide mb-3",
                    isCompleted ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"
                  )}>
                    {isCompleted ? 'Evidence & Proof' : 'Attached Evidence'}
                  </p>

                  <div className="space-y-2">
                    {task.proofDocuments!.map(doc => (
                      <button
                        key={doc.id}
                        onClick={async () => {
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
                        className={cn(
                          "flex items-center gap-2 text-sm hover:underline",
                          isCompleted ? "text-emerald-700 dark:text-emerald-300" : "text-blue-600 dark:text-blue-400"
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        {doc.fileName || 'View document'}
                      </button>
                    ))}
                    {task.completionNotes && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 italic border-t border-current/10 pt-3">
                        {task.completionNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-amber-500" />
              Mark Task as Blocked
            </DialogTitle>
            <DialogDescription>
              What&apos;s preventing progress on this task?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Waiting on client response, missing information..."
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              className="min-h-[100px] resize-none"
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
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isUpdating ? 'Saving...' : 'Mark Blocked'}
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
    </motion.div>
  )
}
