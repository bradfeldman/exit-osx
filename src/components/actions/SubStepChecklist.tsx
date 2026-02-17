'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubTaskUpload } from './sub-tasks/SubTaskUpload'
import { SubTaskText } from './sub-tasks/SubTaskText'
import { SubTaskQuestion } from './sub-tasks/SubTaskQuestion'
import { SubTaskConnect } from './sub-tasks/SubTaskConnect'

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

interface SubStepChecklistProps {
  steps: SubStep[]
  progress: { completed: number; total: number }
  onToggle: (stepId: string, completed: boolean) => void
  onUpdate?: (stepId: string, data: { responseText?: string; responseJson?: unknown; completed?: boolean }) => void
  onUpload?: (stepId: string, file: File) => Promise<void>
}

export function SubStepChecklist({ steps, progress, onToggle, onUpdate, onUpload }: SubStepChecklistProps) {
  if (steps.length === 0) return null

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0

  return (
    <div className="mt-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--burnt-orange)] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {progress.completed} of {progress.total} complete
        </span>
      </div>

      {/* Sub-steps */}
      <div className="mt-3 space-y-1">
        {steps.map(step => {
          const type = step.subTaskType || 'CHECKBOX'

          switch (type) {
            case 'FILE_UPLOAD':
              return (
                <SubTaskUpload
                  key={step.id}
                  stepId={step.id}
                  title={step.title}
                  completed={step.completed}
                  linkedDocId={step.linkedDocId ?? null}
                  acceptedTypes={step.acceptedTypes ?? null}
                  onUpload={onUpload || (async () => {})}
                />
              )

            case 'TEXT_INPUT':
              return (
                <SubTaskText
                  key={step.id}
                  stepId={step.id}
                  title={step.title}
                  completed={step.completed}
                  responseText={step.responseText ?? null}
                  placeholder={step.placeholder ?? null}
                  onUpdate={(id, data) => onUpdate?.(id, data)}
                />
              )

            case 'QUESTION_ANSWER':
              return (
                <SubTaskQuestion
                  key={step.id}
                  stepId={step.id}
                  title={step.title}
                  completed={step.completed}
                  responseJson={step.responseJson}
                  questionOptions={step.questionOptions}
                  onUpdate={(id, data) => onUpdate?.(id, data)}
                />
              )

            case 'CONNECTION':
              return (
                <SubTaskConnect
                  key={step.id}
                  stepId={step.id}
                  title={step.title}
                  completed={step.completed}
                  integrationKey={step.integrationKey ?? null}
                />
              )

            default:
              // CHECKBOX - original behavior
              return (
                <label
                  key={step.id}
                  className="flex items-start gap-3 cursor-pointer group py-1"
                >
                  <button
                    type="button"
                    onClick={() => onToggle(step.id, !step.completed)}
                    className={cn(
                      'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                      step.completed
                        ? 'border-[var(--burnt-orange)] bg-[var(--burnt-orange)]'
                        : 'border-border group-hover:border-muted-foreground'
                    )}
                  >
                    {step.completed && <Check className="h-3 w-3 text-white" />}
                  </button>
                  <span
                    className={cn(
                      'text-sm transition-colors',
                      step.completed
                        ? 'text-muted-foreground line-through'
                        : 'text-foreground'
                    )}
                  >
                    {step.title}
                  </span>
                </label>
              )
          }
        })}
      </div>
    </div>
  )
}
