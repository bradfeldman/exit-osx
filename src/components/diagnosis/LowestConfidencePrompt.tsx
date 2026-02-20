'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface CategoryData {
  category: string
  label: string
  score: number
  isAssessed: boolean
  confidence: {
    dots: number
    label: string
    questionsAnswered: number
    questionsTotal: number
  }
  isLowestConfidence: boolean
}

interface LowestConfidencePromptProps {
  categories: CategoryData[]
  onExpandCategory: (category: string) => void
}

export function LowestConfidencePrompt({
  categories,
  onExpandCategory,
}: LowestConfidencePromptProps) {
  // Find the category with lowest confidence
  const lowestConfidenceCategory = categories.find(cat => cat.isLowestConfidence)

  // Only show if:
  // 1. At least one category has been assessed
  // 2. The lowest confidence category exists
  // 3. The lowest confidence category is not fully answered (< 4 dots)
  const hasAnyAssessment = categories.some(cat => cat.isAssessed)

  if (!hasAnyAssessment || !lowestConfidenceCategory || lowestConfidenceCategory.confidence.dots >= 4) {
    return null
  }

  const { label, confidence, category } = lowestConfidenceCategory
  const questionsRemaining = confidence.questionsTotal - confidence.questionsAnswered

  // Don't show if all questions are answered
  if (questionsRemaining <= 0) {
    return null
  }

  return (
    <Card className="border-orange/20 bg-orange-light/50 dark:border-orange-dark dark:bg-orange-dark/30">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5 text-orange-dark dark:text-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Improve Your Diagnosis Confidence
            </h3>
            <p className="text-sm text-muted-foreground">
              Your <span className="font-medium text-foreground">{label}</span> score is based on limited data.
              Answer {questionsRemaining} more {questionsRemaining === 1 ? 'question' : 'questions'} to improve confidence and get more accurate recommendations.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button
              size="sm"
              onClick={() => onExpandCategory(category)}
              className="whitespace-nowrap"
            >
              Answer Questions →
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
