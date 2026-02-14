'use client'

interface RelatedTask {
  id: string
  title: string
  value: number
  status: string
}

interface RelatedTasksBlockProps {
  tasks: RelatedTask[]
  categoryLabel: string
  onFocusTask?: (taskId: string) => void
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return `${Math.round(value)}`
}

export function RelatedTasksBlock({ tasks, categoryLabel, onFocusTask }: RelatedTasksBlockProps) {
  if (tasks.length === 0) return null

  return (
    <div className="mt-3 pt-3 border-t border-border/30">
      <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
        ALSO IN {categoryLabel.toUpperCase()}
      </p>
      <div className="space-y-1">
        {tasks.map(t => (
          <button key={t.id} onClick={() => onFocusTask?.(t.id)}
            className="flex items-center justify-between w-full text-left px-2 py-1 rounded hover:bg-muted/50 transition-colors">
            <span className="text-sm text-muted-foreground truncate">{t.title}</span>
            <span className="text-xs text-muted-foreground/70 ml-2 shrink-0">~${formatValue(t.value)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
