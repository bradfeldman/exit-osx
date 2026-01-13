'use client'

interface Option {
  id: string
  optionText: string
  scoreValue: string
  displayOrder: number
}

interface Question {
  id: string
  options: Option[]
}

interface QuestionCardProps {
  question: Question
  selectedOptionId?: string
  onAnswer: (optionId: string) => void
  disabled?: boolean
}

export function QuestionCard({
  question,
  selectedOptionId,
  onAnswer,
  disabled,
}: QuestionCardProps) {
  return (
    <div className="space-y-3">
      {question.options.map((option) => {
        const isSelected = selectedOptionId === option.id

        return (
          <button
            key={option.id}
            onClick={() => onAnswer(option.id)}
            disabled={disabled}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-full h-full text-white p-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                {option.optionText}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
