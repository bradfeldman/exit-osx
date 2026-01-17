'use client'

import { cn } from '@/lib/utils'

interface Step {
  id: number
  title: string
  description: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, stepIdx) => {
          const isCompleted = step.id < currentStep
          const isCurrent = step.id === currentStep

          return (
            <div key={step.id} className="flex items-center">
              {/* Step pill */}
              <div
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300',
                  isCurrent && 'bg-primary text-primary-foreground shadow-lg shadow-primary/25',
                  isCompleted && 'bg-primary/15 text-primary',
                  !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
                )}
              >
                {/* Circle/Check */}
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isCurrent && 'bg-white/20',
                    isCompleted && 'bg-primary text-white',
                    !isCurrent && !isCompleted && 'bg-muted-foreground/20'
                  )}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Title - only show on current or larger screens */}
                <span className={cn(
                  'text-sm font-medium hidden sm:inline',
                  isCurrent && 'text-white'
                )}>
                  {step.title}
                </span>
              </div>

              {/* Connector */}
              {stepIdx < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    step.id < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
