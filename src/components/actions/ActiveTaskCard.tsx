'use client'

import { cn } from '@/lib/utils'
import { getBRICategoryColor } from '@/lib/constants/bri-categories'
import { SubStepChecklist } from './SubStepChecklist'
import { CompanyContextBlock } from './CompanyContextBlock'
import { BuyerContextBlock } from './BuyerContextBlock'
import { RelatedTasksBlock } from './RelatedTasksBlock'
import { TaskDetailsCollapsible } from './TaskDetailsCollapsible'
import { TaskStatusActions, type CompletionType } from './TaskStatusActions'
import { TaskNotes } from './TaskNotes'
import { AutomationBanner } from './AutomationBanner'
import { formatCurrency } from '@/lib/utils/currency'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface SubStep {
  id: string
  title: string
  completed: boolean
  subTaskType?: string
  responseText?: string | null
  responseJson?: unknown
  linkedDocId?: string | null
  integrationKey?: string | null
  placeholder?: string | null
  acceptedTypes?: string | null
  questionOptions?: unknown
}

interface ActiveTask {
  id: string
  title: string
  description: string
  briCategory: string
  categoryLabel: string
  normalizedValue: number
  estimatedMinutes: number | null
  effortLevel: string
  status: string
  startedAt: string | null
  daysInProgress: number | null
  priorityRank: number
  buyerConsequence: string | null
  buyerRisk: {
    mainQuestion: string
    consequences: string[]
    conclusion: string
  } | null
  companyContext: {
    yourSituation: { metric: string; value: string; source: string }
    industryBenchmark: { range: string; source: string } | null
    financialImpact: {
      gapDescription: string
      dollarImpact: string
      enterpriseValueImpact: string
      calculation: string
    } | null
    contextNote: string
    dataQuality: 'HIGH' | 'MODERATE' | 'LOW'
    addFinancialsCTA: boolean
    financialSnapshot?: {
      revenue: number
      ebitda: number
      ebitdaMarginPct: number
      enrichedAt: string
    }
    benchmarkSnapshot?: {
      ebitdaMarginLow: number
      ebitdaMarginHigh: number
      ebitdaMultipleLow: number
      ebitdaMultipleHigh: number
      capturedAt: string
    }
  } | null
  financialDrift?: {
    hasDrift: boolean
    items: Array<{ metric: string; oldValue: string; newValue: string; direction: 'up' | 'down'; pctChange: number }>
    enrichedAt: string | null
  } | null
  relatedTasks?: Array<{ id: string; title: string; value: number; status: string }>
  subSteps: SubStep[]
  subStepProgress: { completed: number; total: number }
  successCriteria: { overview: string; outcomes: string[] } | null
  outputFormat: { description: string; formats: string[]; guidance: string } | null
  assignee: { id: string; name: string; email: string; role: string | null } | null
  isAssignedToCurrentUser: boolean
  pendingInvite: { email: string; sentAt: string } | null
  proofDocuments: { id: string; name: string; uploadedAt: string }[]
}

interface ActiveTaskCardProps {
  task: ActiveTask
  onSubStepToggle: (taskId: string, stepId: string, completed: boolean) => void
  onSubStepUpdate?: (taskId: string, stepId: string, data: { responseText?: string; responseJson?: unknown; completed?: boolean }) => void
  onSubStepUpload?: (taskId: string, stepId: string, file: File) => Promise<void>
  onComplete: () => void
  onStart?: () => void
  onBlock: (taskId: string, reason: string) => void
  onDefer?: (taskId: string, deferredUntil: string, reason: string) => void
  onRefresh?: () => void
  onFocusTask?: (taskId: string) => void
  disabled?: boolean
}

/**
 * Derive how a task should be completed based on its title, description, and sub-steps.
 * Tasks whose titles/descriptions indicate uploads go to Evidence Room,
 * integration connections go to the integrations page,
 * assessments go to Diagnosis, and everything else is manual.
 */
function deriveCompletionType(task: ActiveTask): CompletionType {
  const title = task.title.toLowerCase()
  const description = task.description.toLowerCase()
  const combined = `${title} ${description}`

  // Integration tasks: QuickBooks, connect, integration
  if (
    combined.includes('quickbooks') ||
    combined.includes('connect your accounting') ||
    (title.includes('connect') && (combined.includes('integration') || combined.includes('accounting')))
  ) {
    return 'connect_integration'
  }

  // Assessment/diagnosis tasks
  if (
    combined.includes('complete baseline') ||
    combined.includes('complete.*assessment') ||
    (title.includes('assessment') && (combined.includes('diagnosis') || combined.includes('category'))) ||
    title.includes('category assessment')
  ) {
    return 'answer_questions'
  }

  // Upload/evidence tasks: upload, financial statements, evidence
  if (
    title.includes('upload') ||
    combined.includes('upload to evidence') ||
    combined.includes('financial statement') ||
    (combined.includes('evidence room') && (combined.includes('upload') || combined.includes('document')))
  ) {
    return 'upload_document'
  }

  // Check sub-steps for file upload types
  const hasFileUploadSteps = task.subSteps.some(s => s.subTaskType === 'FILE_UPLOAD')
  if (hasFileUploadSteps && title.includes('upload')) {
    return 'upload_document'
  }

  return 'manual'
}

export function ActiveTaskCard({ task, onSubStepToggle, onSubStepUpdate, onSubStepUpload, onComplete, onStart, onBlock, onDefer, onRefresh, onFocusTask, disabled = false }: ActiveTaskCardProps) {
  const metaParts: string[] = []
  metaParts.push(`~${formatCurrency(task.normalizedValue)} impact`)
  if (task.estimatedMinutes) {
    metaParts.push(`${task.estimatedMinutes} min remaining`)
  }
  if (task.startedAt) {
    metaParts.push(`Started ${formatDate(task.startedAt)}`)
  }

  const isPending = task.status === 'PENDING'
  const showStaleNudge = !isPending && task.daysInProgress !== null && task.daysInProgress >= 14

  return (
    <div className={cn(
      'rounded-xl border-2 bg-card p-6 shadow-sm',
      isPending ? 'border-border/50' : 'border-[var(--burnt-orange)]/30',
      disabled && 'opacity-60 pointer-events-none'
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        {isPending ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
            UP NEXT
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--burnt-orange)]">
            <span className="w-2 h-2 rounded-full bg-[var(--burnt-orange)] animate-pulse" />
            IN PROGRESS
          </div>
        )}
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', getBRICategoryColor(task.briCategory))}>
          {task.categoryLabel}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-foreground mt-3">{task.title}</h2>

      {/* Meta line */}
      <p className="text-sm text-muted-foreground mt-1">
        {metaParts.map((part, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            {i === 0 ? <span className="font-medium text-foreground">{part}</span> : part}
          </span>
        ))}
      </p>

      {/* Stale nudge */}
      {showStaleNudge && (
        <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Started {task.daysInProgress} days ago &mdash; still working on this?
          </p>
        </div>
      )}

      {/* Company context (personalized financials + benchmarks) */}
      <CompanyContextBlock companyContext={task.companyContext} taskId={task.id} financialDrift={task.financialDrift} />

      {/* QuickBooks automation banner for financial upload tasks */}
      <AutomationBanner
        briCategory={task.briCategory}
        hasFileUploadSubTasks={task.subSteps.some(s => s.subTaskType === 'FILE_UPLOAD')}
      />

      {/* Related tasks in same category */}
      {task.relatedTasks && task.relatedTasks.length > 0 && (
        <RelatedTasksBlock
          tasks={task.relatedTasks}
          categoryLabel={task.categoryLabel}
          onFocusTask={onFocusTask}
        />
      )}

      {/* Buyer context */}
      <BuyerContextBlock
        buyerConsequence={task.buyerConsequence}
        buyerRisk={task.buyerRisk}
      />

      {/* Sub-steps */}
      <SubStepChecklist
        steps={task.subSteps}
        progress={task.subStepProgress}
        onToggle={(stepId, completed) => onSubStepToggle(task.id, stepId, completed)}
        onUpdate={onSubStepUpdate ? (stepId, data) => onSubStepUpdate(task.id, stepId, data) : undefined}
        onUpload={onSubStepUpload ? (stepId, file) => onSubStepUpload(task.id, stepId, file) : undefined}
      />

      {/* Status actions */}
      <TaskStatusActions
        taskId={task.id}
        onComplete={onComplete}
        onStart={onStart}
        onBlock={onBlock}
        onDefer={onDefer}
        assignee={task.assignee}
        isAssignedToCurrentUser={task.isAssignedToCurrentUser}
        pendingInvite={task.pendingInvite}
        onRefresh={onRefresh}
        completionType={deriveCompletionType(task)}
      />

      {/* Task notes */}
      <div className="mt-4">
        <TaskNotes taskId={task.id} taskTitle={task.title} disabled={disabled} />
      </div>

      {/* Collapsible details */}
      <TaskDetailsCollapsible
        successCriteria={task.successCriteria}
        outputFormat={task.outputFormat}
        description={task.description}
        taskId={task.id}
        taskCategory={task.briCategory}
        enrichmentTier={task.companyContext?.dataQuality ?? 'NONE'}
      />
    </div>
  )
}
