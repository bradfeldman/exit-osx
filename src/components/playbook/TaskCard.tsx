'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskCompletionDialog } from './TaskCompletionDialog'
import { TaskUploadDialog } from './TaskUploadDialog'
import {
  FileText, ChevronDown, Target, AlertTriangle, CheckCircle2,
  ListChecks, FileOutput, TrendingUp, Check, Clock,
  User, AlertCircle, Zap, MoreHorizontal, Paperclip,
  Circle, ArrowRight, Ban, CalendarClock, XCircle, PlayCircle
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

// Status configuration with clear progression
type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'DEFERRED' | 'NOT_APPLICABLE'

const STATUS_CONFIG: Record<string, {
  label: string
  step: number
  color: string
  bgColor: string
  ringColor: string
}> = {
  PENDING: { label: 'Not Started', step: 0, color: 'text-slate-500', bgColor: 'bg-slate-100', ringColor: 'ring-slate-200' },
  IN_PROGRESS: { label: 'In Progress', step: 1, color: 'text-blue-600', bgColor: 'bg-blue-50', ringColor: 'ring-blue-200' },
  BLOCKED: { label: 'Blocked', step: 1, color: 'text-amber-600', bgColor: 'bg-amber-50', ringColor: 'ring-amber-200' },
  COMPLETED: { label: 'Completed', step: 2, color: 'text-emerald-600', bgColor: 'bg-emerald-50', ringColor: 'ring-emerald-200' },
  DEFERRED: { label: 'Deferred', step: 0, color: 'text-slate-400', bgColor: 'bg-slate-50', ringColor: 'ring-slate-200' },
  NOT_APPLICABLE: { label: 'Not Applicable', step: -1, color: 'text-slate-400', bgColor: 'bg-slate-50', ringColor: 'ring-slate-200' },
}

// Impact indicator - subtle but present
function getImpactConfig(issueTier: string | null | undefined) {
  switch (issueTier) {
    case 'CRITICAL':
      return { label: 'Critical', color: 'text-rose-600', dotColor: 'bg-rose-500', icon: AlertCircle }
    case 'SIGNIFICANT':
      return { label: 'High Impact', color: 'text-amber-600', dotColor: 'bg-amber-500', icon: Zap }
    default:
      return { label: 'Optimization', color: 'text-sky-600', dotColor: 'bg-sky-500', icon: TrendingUp }
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
 * Status Progress Indicator - Visual representation of task progress
 */
function StatusIndicator({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  const isCompleted = status === 'COMPLETED'
  const isBlocked = status === 'BLOCKED'
  const isInProgress = status === 'IN_PROGRESS'
  const isNotApplicable = status === 'NOT_APPLICABLE'
  const isDeferred = status === 'DEFERRED'

  if (isNotApplicable || isDeferred) {
    return (
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center",
          isNotApplicable ? "bg-slate-200" : "bg-slate-100"
        )}>
          {isNotApplicable ? (
            <XCircle className="w-3 h-3 text-slate-400" />
          ) : (
            <CalendarClock className="w-3 h-3 text-slate-400" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {/* Step 1: Not Started / In Progress */}
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300",
        isInProgress || isBlocked || isCompleted
          ? isBlocked
            ? "bg-amber-500 ring-2 ring-amber-200"
            : "bg-blue-500 ring-2 ring-blue-200"
          : "bg-slate-200"
      )}>
        {isBlocked ? (
          <AlertCircle className="w-3 h-3 text-white" />
        ) : isInProgress ? (
          <PlayCircle className="w-3 h-3 text-white" />
        ) : (isCompleted) ? (
          <Check className="w-3 h-3 text-white" />
        ) : (
          <Circle className="w-2.5 h-2.5 text-slate-400" />
        )}
      </div>

      {/* Connector */}
      <div className={cn(
        "w-6 h-0.5 transition-all duration-300",
        isCompleted ? "bg-emerald-500" : "bg-slate-200"
      )} />

      {/* Step 2: Completed */}
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300",
        isCompleted
          ? "bg-emerald-500 ring-2 ring-emerald-200"
          : "bg-slate-200"
      )}>
        {isCompleted ? (
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        ) : (
          <Circle className="w-2.5 h-2.5 text-slate-400" />
        )}
      </div>
    </div>
  )
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

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING
  const impactConfig = getImpactConfig(task.issueTier)
  const effortConfig = getEffortConfig(task.effortLevel)
  const isCompleted = task.status === 'COMPLETED'
  const isBlocked = task.status === 'BLOCKED'
  const isInProgress = task.status === 'IN_PROGRESS'
  const isPending = task.status === 'PENDING'
  const isDeferred = task.status === 'DEFERRED'
  const isNotApplicable = task.status === 'NOT_APPLICABLE'
  const hasDocuments = task.proofDocuments && task.proofDocuments.length > 0

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'COMPLETED' && task.status !== 'COMPLETED') {
      setShowCompletionDialog(true)
      return
    }
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

  const handleComplete = async (taskId: string, completionNotes?: string) => {
    setIsUpdating(true)
    await onStatusChange(taskId, 'COMPLETED', completionNotes ? { completionNotes } : undefined)
    setIsUpdating(false)
  }

  // Primary action based on current status
  const getPrimaryAction = () => {
    if (isNotApplicable) return null

    if (isCompleted) {
      return {
        label: 'Reopen',
        action: () => handleStatusChange('IN_PROGRESS'),
        variant: 'outline' as const,
        className: 'text-slate-600 hover:text-slate-700',
      }
    }

    if (isBlocked || isDeferred) {
      return {
        label: 'Resume',
        action: () => handleStatusChange('IN_PROGRESS'),
        variant: 'outline' as const,
        className: 'text-blue-600 border-blue-200 hover:bg-blue-50',
      }
    }

    if (isInProgress) {
      return {
        label: 'Complete',
        action: () => handleStatusChange('COMPLETED'),
        variant: 'default' as const,
        className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      }
    }

    // Pending
    return {
      label: 'Start',
      action: () => handleStatusChange('IN_PROGRESS'),
      variant: 'default' as const,
      className: 'bg-blue-600 hover:bg-blue-700 text-white',
    }
  }

  const primaryAction = getPrimaryAction()

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
        <div className="flex gap-4">
          {/* Status Indicator */}
          <div className="flex-shrink-0 pt-0.5">
            <StatusIndicator status={task.status} />
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Title */}
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

              {/* Assignee */}
              {showAssignment && task.primaryAssignee && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
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

            {/* Blocked Alert */}
            {isBlocked && task.blockedReason && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/50">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">{task.blockedReason}</p>
              </div>
            )}

            {/* Status Label + Expand */}
            <div className="mt-3 flex items-center gap-3">
              <span className={cn(
                "text-xs font-medium",
                statusConfig.color
              )}>
                {statusConfig.label}
              </span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex items-center gap-1"
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
          </div>

          {/* Right Side Actions */}
          <div className="flex-shrink-0 flex items-start gap-2">
            {/* Primary Action Button */}
            {primaryAction && (
              <Button
                size="sm"
                variant={primaryAction.variant}
                onClick={primaryAction.action}
                disabled={isUpdating}
                className={cn("hidden sm:flex", primaryAction.className)}
              >
                {primaryAction.label}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}

            {/* More Actions Menu */}
            {!isNotApplicable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {/* Status Changes */}
                  {isPending && (
                    <DropdownMenuItem onClick={() => handleStatusChange('IN_PROGRESS')}>
                      <PlayCircle className="mr-2 h-4 w-4 text-blue-500" />
                      Start Task
                    </DropdownMenuItem>
                  )}
                  {isInProgress && (
                    <DropdownMenuItem onClick={() => handleStatusChange('COMPLETED')}>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                      Mark Complete
                    </DropdownMenuItem>
                  )}
                  {(isBlocked || isDeferred) && (
                    <DropdownMenuItem onClick={() => handleStatusChange('IN_PROGRESS')}>
                      <PlayCircle className="mr-2 h-4 w-4 text-blue-500" />
                      Resume Task
                    </DropdownMenuItem>
                  )}
                  {isCompleted && (
                    <DropdownMenuItem onClick={() => handleStatusChange('IN_PROGRESS')}>
                      <PlayCircle className="mr-2 h-4 w-4 text-blue-500" />
                      Reopen Task
                    </DropdownMenuItem>
                  )}

                  {(isPending || isInProgress) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowBlockedDialog(true)}>
                        <Ban className="mr-2 h-4 w-4 text-amber-500" />
                        Mark Blocked
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />

                  {/* Assignment */}
                  {onAssign && (
                    <DropdownMenuItem onClick={() => onAssign(task.id)}>
                      <User className="mr-2 h-4 w-4" />
                      {task.primaryAssignee ? 'Reassign' : 'Assign'}
                    </DropdownMenuItem>
                  )}

                  {/* Evidence */}
                  {!isCompleted && (
                    <DropdownMenuItem onClick={() => setShowUploadDialog(true)}>
                      <Paperclip className="mr-2 h-4 w-4" />
                      Add Evidence
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {/* Planning */}
                  {!isDeferred && !isCompleted && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange('DEFERRED')}
                      className="text-slate-500"
                    >
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Defer Task
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleStatusChange('NOT_APPLICABLE')}
                    className="text-slate-500"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Not Applicable
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
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
              {(hasDocuments || !isCompleted) && (
                <div className={cn(
                  "p-4 rounded-lg border",
                  isCompleted
                    ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-700/50"
                    : "bg-white dark:bg-slate-900 border-slate-200/50 dark:border-slate-700/50"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <p className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      isCompleted ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500"
                    )}>
                      {isCompleted ? 'Evidence & Proof' : 'Evidence'}
                    </p>
                    {!isCompleted && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowUploadDialog(true)}
                        className="h-7 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Paperclip className="h-3 w-3 mr-1.5" />
                        Add
                      </Button>
                    )}
                  </div>

                  {hasDocuments ? (
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
                  ) : (
                    <p className="text-sm text-slate-500">
                      No evidence attached yet
                    </p>
                  )}
                </div>
              )}

              {/* Mobile Primary Action */}
              {primaryAction && (
                <div className="sm:hidden">
                  <Button
                    className={cn("w-full", primaryAction.className)}
                    variant={primaryAction.variant}
                    onClick={primaryAction.action}
                    disabled={isUpdating}
                  >
                    {primaryAction.label}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
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
