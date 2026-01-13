'use client'

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
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.id} className={`${stepIdx !== steps.length - 1 ? 'flex-1' : ''} relative`}>
            <div className="flex items-center">
              <div
                className={`
                  relative flex h-10 w-10 items-center justify-center rounded-full border-2
                  ${step.id < currentStep
                    ? 'bg-blue-600 border-blue-600'
                    : step.id === currentStep
                    ? 'border-blue-600 bg-white'
                    : 'border-gray-300 bg-white'
                  }
                `}
              >
                {step.id < currentStep ? (
                  <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className={`text-sm font-medium ${step.id === currentStep ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.id}
                  </span>
                )}
              </div>

              {stepIdx !== steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 ${step.id < currentStep ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              )}
            </div>

            <div className="mt-2 min-w-max">
              <span className={`text-sm font-medium ${step.id <= currentStep ? 'text-gray-900' : 'text-gray-500'}`}>
                {step.title}
              </span>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  )
}
