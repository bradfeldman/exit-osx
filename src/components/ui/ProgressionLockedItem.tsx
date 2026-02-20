'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ProgressionLockedItemProps {
  name: string
  icon: React.ComponentType<{ className?: string }>
  unlockHint: string
  className?: string
}

export function ProgressionLockedItem({
  name,
  icon: IconComponent,
  unlockHint,
  className,
}: ProgressionLockedItemProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setShowTooltip(true)}
            className={cn(
              'group flex w-full gap-x-3 rounded-md p-2 text-sm font-medium leading-6 transition-colors',
              'text-sidebar-foreground/40 hover:bg-sidebar-accent/30 cursor-not-allowed',
              className
            )}
          >
            <IconComponent className="h-5 w-5 shrink-0 text-sidebar-foreground/30" />
            <span className="flex-1 text-left">{name}</span>
            <ProgressionLockIcon className="h-4 w-4 text-sidebar-foreground/30" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-[200px] bg-foreground text-white border-foreground"
        >
          <div className="flex items-start gap-2">
            <SparklesIcon className="h-4 w-4 shrink-0 text-orange mt-0.5" />
            <span className="text-sm">{unlockHint}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Special lock icon that indicates progression-based locking (vs subscription)
function ProgressionLockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
}
