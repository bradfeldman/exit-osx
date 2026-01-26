'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { TaskCompletionDialog } from './TaskCompletionDialog'
import { TaskUploadDialog } from './TaskUploadDialog'
import {
  FileText, ChevronDown, Target, AlertTriangle, CheckCircle2,
  ListChecks, FileOutput, TrendingUp, Upload, Check, Clock,
  User, AlertCircle, Zap, Shield, Play, Pause, XCircle
} from 'lucide-react'
import { type RichTaskDescription, hasRichDescription } from '@/lib/playbook/rich-task-description'
import { getBRICategoryLabel, getBRICategoryColor } from '@/lib/constants/bri-categories'

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

function getEffortBadge(effort: string): { label: string; color: string } {
  switch (effort) {
    case 'MINIMAL':
    case 'LOW':
      return { label: 'Quick Win', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
    case 'MODERATE':
      return { label: 'Medium Effort', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    case 'HIGH':
    case 'MAJOR':
      return { label: 'Major Project', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' }
    default:
      return { label: 'Medium Effort', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
  }
}

function getImpactInfo(issueTier: string | null | undefined): { label: string; icon: typeof Zap; color: string; bgColor: string } {
  switch (issueTier) {
    case 'CRITICAL':
      return {
        label: 'Critical Risk',
        icon: AlertCircle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20'
      }
    case 'SIGNIFICANT':
      return {
        label: 'High Impact',
        icon: Zap,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20'
      }
    default:
      return {
        label: 'Optimization',
        icon: TrendingUp,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20'
      }
  }
}

function getStatusConfig(status: string): {
  label: string;
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'Completed',
        icon: CheckCircle2,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800'
      }
    case 'IN_PROGRESS':
      return {
        label: 'In Progress',
        icon: Play,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800'
      }
    case 'BLOCKED':
      return {
        label: 'Blocked',
        icon: Pause,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800'
      }
    case 'DEFERRED':
      return {
        label: 'Deferred',
        icon: Clock,
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      }
    case 'NOT_APPLICABLE':
      return {
        label: 'Not Applicable',
        icon: XCircle,
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        borderColor: 'border-gray-200 dark:border-gray-700'
      }
    default:
      return {
        label: 'Not Started',
        icon: Target,
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        borderColor: 'border-gray-200 dark:border-gray-700'
      }
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
    return { text: `Overdue`, isOverdue: true, isUrgent: false }
  } else if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false, isUrgent: true }
  } else if (diffDays <= 3) {
    return { text: `Due ${formatted}`, isOverdue: false, isUrgent: true }
  }
  return { text: `Due ${formatted}`, isOverdue: false, isUrgent: false }
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
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${iconColor}`} />
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
            <div className="px-4 py-3 bg-background text-sm">
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
      {/* Why This Applies */}
      <RichDescriptionSection
        title="Why This Applies"
        icon={Target}
        iconColor="text-blue-600 dark:text-blue-400"
        defaultOpen={true}
      >
        <p className="text-foreground/80 whitespace-pre-line leading-relaxed">
          {richDescription.whyThisApplies}
        </p>
      </RichDescriptionSection>

      {/* Buyer Risk */}
      <RichDescriptionSection
        title="Buyer Risk"
        icon={AlertTriangle}
        iconColor="text-amber-600 dark:text-amber-400"
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

      {/* Success Criteria */}
      <RichDescriptionSection
        title="Success Criteria"
        icon={CheckCircle2}
        iconColor="text-green-600 dark:text-green-400"
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

      {/* Sub-Tasks */}
      <RichDescriptionSection
        title="Steps to Complete"
        icon={ListChecks}
        iconColor="text-purple-600 dark:text-purple-400"
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

      {/* Output Format */}
      <RichDescriptionSection
        title="Required Output"
        icon={FileOutput}
        iconColor="text-indigo-600 dark:text-indigo-400"
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

      {/* Exit Impact */}
      <RichDescriptionSection
        title="Exit Impact"
        icon={TrendingUp}
        iconColor="text-emerald-600 dark:text-emerald-400"
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

  const statusConfig = getStatusConfig(task.status)
  const impactInfo = getImpactInfo(task.issueTier)
  const effortBadge = getEffortBadge(task.effortLevel)
  const ImpactIcon = impactInfo.icon
  const StatusIcon = statusConfig.icon
  const isCompleted = task.status === 'COMPLETED'
  const isBlocked = task.status === 'BLOCKED'

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-xl border bg-card transition-all duration-200 ${
        isCompleted
          ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
          : isBlocked
            ? 'border-red-200 dark:border-red-800'
            : 'border-border hover:border-[#B87333]/30 hover:shadow-lg'
      }`}
    >
      {/* Main Card Content */}
      <div className="p-5">
        <div className="flex gap-4">
          {/* Completion Checkbox - Made more prominent */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleStatusChange(isCompleted ? 'PENDING' : 'COMPLETED')}
            disabled={isUpdating}
            className={`flex-shrink-0 w-7 h-7 mt-0.5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
              isCompleted
                ? 'bg-green-500 border-green-500 text-white shadow-md'
                : 'border-gray-300 dark:border-gray-600 hover:border-[#B87333] hover:bg-[#B87333]/5'
            } ${isUpdating ? 'opacity-50' : ''}`}
          >
            {isCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </motion.div>
            )}
          </motion.button>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Top Row: Impact indicator + Category */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${impactInfo.bgColor} ${impactInfo.color}`}>
                <ImpactIcon className="h-3 w-3" />
                {impactInfo.label}
              </div>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getBRICategoryColor(task.briCategory)}`}>
                {getBRICategoryLabel(task.briCategory, true)}
              </span>
            </div>

            {/* Title */}
            <h3 className={`text-base font-semibold mb-2 leading-tight ${
              isCompleted
                ? 'text-muted-foreground line-through'
                : 'text-foreground'
            }`}>
              {task.title}
            </h3>

            {/* Meta Row: Effort, Status, Due Date, Assignee */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {/* Effort Badge */}
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${effortBadge.color}`}>
                {effortBadge.label}
              </span>

              {/* Status Badge - Always show */}
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div className={`inline-flex items-center gap-1 text-xs ${
                  formatDueDate(task.dueDate).isOverdue
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : formatDueDate(task.dueDate).isUrgent
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-muted-foreground'
                }`}>
                  <Clock className="h-3 w-3" />
                  {formatDueDate(task.dueDate).text}
                </div>
              )}

              {/* Assignee */}
              {showAssignment && (
                <>
                  {task.primaryAssignee ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      {task.primaryAssignee.avatarUrl ? (
                        <img
                          src={task.primaryAssignee.avatarUrl}
                          alt={task.primaryAssignee.name || task.primaryAssignee.email}
                          className="w-4 h-4 rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-[#B87333]/10 text-[#B87333] text-[10px] flex items-center justify-center font-medium">
                          {getInitials(task.primaryAssignee.name, task.primaryAssignee.email)}
                        </div>
                      )}
                      <span className="truncate max-w-[80px]">
                        {task.primaryAssignee.name || task.primaryAssignee.email.split('@')[0]}
                      </span>
                    </div>
                  ) : task.invites && task.invites.length > 0 ? (
                    <div className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                      <Clock className="h-3 w-3" />
                      Invite pending
                    </div>
                  ) : onAssign ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onAssign(task.id) }}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[#B87333] transition-colors"
                    >
                      <User className="h-3 w-3" />
                      Assign
                    </button>
                  ) : null}
                </>
              )}
            </div>

            {/* Blocked Reason Preview */}
            {isBlocked && task.blockedReason && (
              <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Blocked</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{task.blockedReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#B87333] hover:text-[#A36429] transition-colors"
            >
              {isExpanded ? 'Hide details' : 'View details'}
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </button>
          </div>

          {/* Right Side: Quick Action Button */}
          {task.status !== 'NOT_APPLICABLE' && (
            <div className="flex-shrink-0 hidden sm:block">
              {task.status === 'PENDING' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={isUpdating}
                  className="bg-[#B87333] hover:bg-[#A36429] text-white"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Start
                </Button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('COMPLETED')}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Complete
                </Button>
              )}
              {task.status === 'COMPLETED' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={isUpdating}
                  variant="outline"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Reopen
                </Button>
              )}
              {task.status === 'BLOCKED' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={isUpdating}
                  variant="outline"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Resume
                </Button>
              )}
              {task.status === 'DEFERRED' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={isUpdating}
                  variant="outline"
                >
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Resume
                </Button>
              )}
            </div>
          )}
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
            className="overflow-hidden border-t border-border"
          >
            <div className="p-5 space-y-4 bg-muted/30">
              {/* Rich Description or Basic Description */}
              {hasRichDescription(task.richDescription) ? (
                <RichDescriptionView richDescription={task.richDescription} />
              ) : (
                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="text-sm text-foreground/80 leading-relaxed">{task.description}</p>
                </div>
              )}

              {/* Task Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Action Type</p>
                  <p className="font-medium text-foreground">{ACTION_TYPE_LABELS[task.actionType] || task.actionType}</p>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Complexity</p>
                  <p className="font-medium text-foreground capitalize">{task.complexity.toLowerCase()}</p>
                </div>
              </div>

              {/* Upload Section */}
              {!isCompleted && (
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowUploadDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Attach supporting documents for this task
                  </p>
                </div>
              )}

              {/* Uploaded Documents */}
              {task.proofDocuments && task.proofDocuments.length > 0 && (
                <div className={`p-4 rounded-lg border ${
                  isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}>
                  <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${
                    isCompleted ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'
                  }`}>
                    {isCompleted ? 'Proof of Completion' : 'Attached Documents'}
                  </p>
                  <div className="space-y-2">
                    {task.proofDocuments.map(doc => (
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
                        className={`flex items-center gap-2 text-sm hover:underline ${
                          isCompleted ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                        {doc.fileName || 'View document'}
                      </button>
                    ))}
                  </div>
                  {task.completionNotes && (
                    <p className="mt-3 text-sm text-foreground/70 italic border-t border-current/10 pt-2">
                      Notes: {task.completionNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {task.status !== 'NOT_APPLICABLE' && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {/* Primary Actions - Mobile */}
                  <div className="sm:hidden w-full mb-2">
                    {task.status === 'PENDING' && (
                      <Button
                        className="w-full bg-[#B87333] hover:bg-[#A36429] text-white"
                        onClick={() => handleStatusChange('IN_PROGRESS')}
                        disabled={isUpdating}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Working
                      </Button>
                    )}
                    {task.status === 'IN_PROGRESS' && (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStatusChange('COMPLETED')}
                        disabled={isUpdating}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                    {task.status === 'COMPLETED' && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleStatusChange('IN_PROGRESS')}
                        disabled={isUpdating}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Reopen Task
                      </Button>
                    )}
                    {(task.status === 'BLOCKED' || task.status === 'DEFERRED') && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleStatusChange('IN_PROGRESS')}
                        disabled={isUpdating}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume Working
                      </Button>
                    )}
                  </div>

                  {/* Secondary Actions */}
                  {(task.status === 'IN_PROGRESS' || task.status === 'PENDING') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                      onClick={() => handleStatusChange('BLOCKED')}
                      disabled={isUpdating}
                    >
                      <Pause className="h-3.5 w-3.5 mr-1.5" />
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
                      <User className="h-3.5 w-3.5 mr-1.5" />
                      {task.primaryAssignee ? 'Re-assign' : 'Assign'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStatusChange('DEFERRED')}
                    disabled={isUpdating}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Defer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => handleStatusChange('NOT_APPLICABLE')}
                    disabled={isUpdating}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Not Applicable
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
            <DialogTitle>Mark Task as Blocked</DialogTitle>
            <DialogDescription>
              What&apos;s preventing progress on this task?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Waiting on client response, missing information, dependency on another task..."
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              className="min-h-[100px]"
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
              className="bg-red-600 hover:bg-red-700 text-white"
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
