// Task generation service
// Analyzes assessment responses and creates prioritized tasks

import { prisma } from '@/lib/prisma'
import { getTemplatesForQuestion } from './task-templates'
import type { TaskTemplate } from './task-templates'

// Use flexible types to handle Prisma Decimal
type NumberLike = string | number | { toString(): string }

interface AssessmentResponse {
  questionId: string
  question: {
    id: string
    questionText: string
    briCategory: string
    maxImpactPoints: NumberLike
  }
  selectedOption: {
    scoreValue: NumberLike
  }
}

interface ValuationSnapshot {
  valueGap: NumberLike
  briScore: NumberLike
}

export async function generateTasksForCompany(
  companyId: string,
  responses: AssessmentResponse[],
  snapshot: ValuationSnapshot
): Promise<{ created: number; skipped: number }> {
  const valueGap = Number(snapshot.valueGap)
  const briScore = Number(snapshot.briScore)

  // Calculate total potential improvement points
  const totalMaxPoints = responses.reduce(
    (sum, r) => sum + Number(r.question.maxImpactPoints),
    0
  )

  // Clear existing pending tasks for this company
  await prisma.task.deleteMany({
    where: {
      companyId,
      status: 'PENDING',
    },
  })

  let created = 0
  let skipped = 0

  // Generate tasks for each low-scoring response
  for (const response of responses) {
    const score = Number(response.selectedOption.scoreValue)
    const maxPoints = Number(response.question.maxImpactPoints)

    // Get matching templates
    const templates = getTemplatesForQuestion(response.question.questionText)

    for (const template of templates) {
      // Only generate tasks if score is below threshold
      if (score >= template.scoreThreshold) {
        skipped++
        continue
      }

      // Calculate how much improvement is possible
      const pointsLost = maxPoints * (1 - score)
      const categoryWeight = getCategoryWeight(template.briCategory)

      for (const taskDef of template.tasks) {
        // Calculate value impact
        // rawImpact = portion of value gap this task could address
        const potentialScoreImprovement = (taskDef.impactMultiplier * pointsLost) / totalMaxPoints
        const rawImpact = valueGap * potentialScoreImprovement * categoryWeight

        // Normalize value based on effort (ROI-like metric)
        const effortMultiplier = getEffortMultiplier(taskDef.effortLevel)
        const normalizedValue = rawImpact / effortMultiplier

        try {
          await prisma.task.create({
            data: {
              companyId,
              title: taskDef.title,
              description: taskDef.description,
              actionType: taskDef.actionType,
              briCategory: template.briCategory,
              linkedQuestionId: response.questionId,
              rawImpact,
              normalizedValue,
              effortLevel: taskDef.effortLevel,
              complexity: taskDef.complexity,
              estimatedHours: taskDef.estimatedHours,
              status: 'PENDING',
            },
          })
          created++
        } catch (error) {
          console.error('Error creating task:', error)
          skipped++
        }
      }
    }
  }

  return { created, skipped }
}

function getCategoryWeight(category: string): number {
  const weights: Record<string, number> = {
    FINANCIAL: 0.25,
    TRANSFERABILITY: 0.20,
    OPERATIONAL: 0.20,
    MARKET: 0.15,
    LEGAL_TAX: 0.10,
    PERSONAL: 0.10,
  }
  return weights[category] || 0.1
}

function getEffortMultiplier(effort: string): number {
  const multipliers: Record<string, number> = {
    MINIMAL: 0.5,
    LOW: 1,
    MODERATE: 2,
    HIGH: 4,
    MAJOR: 8,
  }
  return multipliers[effort] || 2
}
