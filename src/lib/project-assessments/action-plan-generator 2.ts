/**
 * Action Plan Generator
 *
 * Generates tasks (action plans) based on Project Assessment responses.
 * Uses the strategies and task templates from the ProjectQuestion data
 * to create targeted, prioritized tasks for a 30-90 day action plan.
 */

import { prisma } from '@/lib/prisma'
import type { BriCategory, EffortLevel, ComplexityLevel } from '@prisma/client'

// Effort multipliers for ROI calculation
const EFFORT_MULTIPLIERS: Record<EffortLevel, number> = {
  MINIMAL: 0.5,
  LOW: 1,
  MODERATE: 2,
  HIGH: 4,
  MAJOR: 8,
}

// Category weights for value impact calculation
const DEFAULT_BRI_WEIGHTS: Record<string, number> = {
  FINANCIAL: 0.25,
  TRANSFERABILITY: 0.20,
  OPERATIONAL: 0.20,
  MARKET: 0.15,
  LEGAL_TAX: 0.10,
  PERSONAL: 0.10,
}

interface AssessmentResponse {
  questionId: string
  selectedOptionId: string
  question: {
    id?: string
    briCategory: string
  }
  selectedOption: {
    id?: string
    scoreValue: unknown
  }
}

interface GeneratedTask {
  id: string
  title: string
  briCategory: BriCategory
  estimatedHours: number
  rawImpact: number
}

/**
 * Generate action plan tasks from Project Assessment responses
 */
export async function generateActionPlanFromResponses(
  companyId: string,
  responses: AssessmentResponse[]
): Promise<{
  tasksCreated: number
  totalEstimatedHours: number
  estimatedValueImpact: number
  topTasks: GeneratedTask[]
}> {
  // Get current value gap for impact calculations
  const latestSnapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { valueGap: true }
  })
  const valueGap = latestSnapshot ? Number(latestSnapshot.valueGap) : 0

  const tasksToCreate: Array<{
    title: string
    description: string
    actionType: string
    briCategory: BriCategory
    linkedQuestionId: string
    upgradesFromOptionId: string | null
    upgradesToOptionId: string | null
    rawImpact: number
    normalizedValue: number
    effortLevel: EffortLevel
    complexity: ComplexityLevel
    estimatedHours: number | null
  }> = []

  // Process each response
  for (const response of responses) {
    const currentScore = Number(response.selectedOption.scoreValue)

    // Skip if already at max score
    if (currentScore >= 1.0) continue

    // Get the project question with its strategies and task templates
    const projectQuestion = await prisma.projectQuestion.findFirst({
      where: { id: response.questionId },
      include: {
        strategies: {
          include: {
            taskTemplates: {
              include: {
                upgradesFromOption: true,
                upgradesToOption: true,
              },
              orderBy: { sequence: 'asc' }
            }
          },
          orderBy: { upgradeFromScore: 'asc' }
        },
        options: {
          orderBy: { scoreValue: 'asc' }
        }
      }
    })

    if (!projectQuestion) continue

    // Find the appropriate strategy based on current score
    // If score is low (< 0.5), prefer PARTIAL_MITIGATION or RISK_ACCEPTANCE
    // If score is medium (0.5-0.7), prefer FULL_FIX or PARTIAL_MITIGATION
    let selectedStrategy = projectQuestion.strategies.find(s => {
      if (currentScore < 0.4) {
        return s.strategyType === 'PARTIAL_MITIGATION' || s.strategyType === 'RISK_ACCEPTANCE'
      } else if (currentScore < 0.7) {
        return s.strategyType === 'FULL_FIX' || s.strategyType === 'PARTIAL_MITIGATION'
      } else {
        return s.strategyType === 'FULL_FIX'
      }
    })

    // Fallback to first strategy if no match
    if (!selectedStrategy && projectQuestion.strategies.length > 0) {
      selectedStrategy = projectQuestion.strategies[0]
    }

    if (!selectedStrategy) continue

    // Get task templates for this strategy
    for (const taskTemplate of selectedStrategy.taskTemplates) {
      // Check if this task applies to current score level
      const taskFromScore = taskTemplate.upgradesFromScore
        ? Number(taskTemplate.upgradesFromScore)
        : null

      if (taskFromScore !== null) {
        // Only create task if user's score matches the upgrade-from score (with tolerance)
        const scoreTolerance = 0.1
        if (Math.abs(currentScore - taskFromScore) > scoreTolerance) {
          continue
        }
      }

      // Calculate estimated value impact
      const toScore = taskTemplate.upgradesToScore
        ? Number(taskTemplate.upgradesToScore)
        : currentScore + 0.2

      const scoreImprovement = toScore - currentScore
      const categoryWeight = DEFAULT_BRI_WEIGHTS[response.question.briCategory] || 0.15
      const estimatedValueImpact = scoreImprovement * categoryWeight * valueGap

      // Calculate normalized value (ROI-like metric)
      const effortMultiplier = EFFORT_MULTIPLIERS[taskTemplate.effortLevel] || 2
      const normalizedValue = estimatedValueImpact / effortMultiplier

      // Find option IDs for upgrade mapping
      const fromOption = projectQuestion.options.find(
        o => Math.abs(Number(o.scoreValue) - currentScore) < 0.1
      )
      const toOption = projectQuestion.options.find(
        o => Math.abs(Number(o.scoreValue) - toScore) < 0.1
      )

      // Map primaryVerb to ActionItemType
      const actionType = mapVerbToActionType(taskTemplate.primaryVerb)

      tasksToCreate.push({
        title: taskTemplate.title,
        description: `${taskTemplate.outcome || taskTemplate.object}. Deliverables: ${taskTemplate.deliverables.join(', ')}`,
        actionType,
        briCategory: response.question.briCategory as BriCategory,
        linkedQuestionId: response.questionId,
        upgradesFromOptionId: fromOption?.id || null,
        upgradesToOptionId: toOption?.id || null,
        rawImpact: estimatedValueImpact,
        normalizedValue,
        effortLevel: taskTemplate.effortLevel,
        complexity: taskTemplate.complexity,
        estimatedHours: taskTemplate.estimatedHours,
      })
    }
  }

  // Sort by normalized value (highest ROI first) and limit to reasonable number
  tasksToCreate.sort((a, b) => b.normalizedValue - a.normalizedValue)
  const tasksToCreateLimited = tasksToCreate.slice(0, 15) // Max 15 tasks per assessment

  // Create tasks in database
  let tasksCreated = 0
  let totalEstimatedHours = 0
  let estimatedValueImpact = 0
  const topTasks: GeneratedTask[] = []

  for (const taskData of tasksToCreateLimited) {
    // Check if similar task already exists
    const existingTask = await prisma.task.findFirst({
      where: {
        companyId,
        title: taskData.title,
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      }
    })

    if (existingTask) {
      continue // Skip duplicate
    }

    try {
      const task = await prisma.task.create({
        data: {
          companyId,
          title: taskData.title,
          description: taskData.description,
          actionType: taskData.actionType as never,
          briCategory: taskData.briCategory,
          linkedQuestionId: taskData.linkedQuestionId,
          upgradesFromOptionId: taskData.upgradesFromOptionId,
          upgradesToOptionId: taskData.upgradesToOptionId,
          rawImpact: taskData.rawImpact,
          normalizedValue: taskData.normalizedValue,
          effortLevel: taskData.effortLevel,
          complexity: taskData.complexity,
          estimatedHours: taskData.estimatedHours,
          status: 'PENDING',
        }
      })

      tasksCreated++
      totalEstimatedHours += taskData.estimatedHours || 0
      estimatedValueImpact += taskData.rawImpact

      if (topTasks.length < 5) {
        topTasks.push({
          id: task.id,
          title: task.title,
          briCategory: task.briCategory,
          estimatedHours: task.estimatedHours || 0,
          rawImpact: taskData.rawImpact,
        })
      }
    } catch (error) {
      console.error(`Error creating task "${taskData.title}":`, error)
    }
  }

  console.log(`[ACTION_PLAN] Generated ${tasksCreated} tasks for company ${companyId}`)
  console.log(`[ACTION_PLAN] Total estimated hours: ${totalEstimatedHours}`)
  console.log(`[ACTION_PLAN] Estimated value impact: $${estimatedValueImpact.toFixed(2)}`)

  return {
    tasksCreated,
    totalEstimatedHours,
    estimatedValueImpact,
    topTasks,
  }
}

/**
 * Map primary verb to ActionItemType
 */
function mapVerbToActionType(verb: string): string {
  const verbMap: Record<string, string> = {
    'DOCUMENT': 'TYPE_II_DOCUMENTATION',
    'FORMALIZE': 'TYPE_IV_INSTITUTIONALIZE',
    'VALIDATE': 'TYPE_I_EVIDENCE',
    'REMEDIATE': 'TYPE_V_RISK_REDUCTION',
    'STABILIZE': 'TYPE_III_OPERATIONAL',
    'PROTECT': 'TYPE_V_RISK_REDUCTION',
    'ALIGN': 'TYPE_VI_ALIGNMENT',
    'SIMPLIFY': 'TYPE_III_OPERATIONAL',
    'SEGREGATE': 'TYPE_III_OPERATIONAL',
    'RESTRUCTURE': 'TYPE_IV_INSTITUTIONALIZE',
    'CENTRALIZE': 'TYPE_IV_INSTITUTIONALIZE',
    'DELEGATE': 'TYPE_IV_INSTITUTIONALIZE',
    'PRIORITIZE': 'TYPE_VI_ALIGNMENT',
    'PHASE': 'TYPE_VII_READINESS',
    'PILOT': 'TYPE_VII_READINESS',
    'TRANSITION': 'TYPE_VII_READINESS',
    'DEFER': 'TYPE_X_DEFER',
    'DISCLOSE': 'TYPE_VIII_SIGNALING',
    'FRAME': 'TYPE_VIII_SIGNALING',
    'COMMIT': 'TYPE_VI_ALIGNMENT',
  }

  return verbMap[verb] || 'TYPE_II_DOCUMENTATION'
}

/**
 * Get action plan summary for a company
 */
export async function getActionPlanSummary(companyId: string): Promise<{
  totalTasks: number
  pendingTasks: number
  completedTasks: number
  inProgressTasks: number
  totalEstimatedHours: number
  completedHours: number
  estimatedValueImpact: number
  completedValueImpact: number
  tasksByCategory: Record<string, number>
}> {
  const tasks = await prisma.task.findMany({
    where: { companyId },
    select: {
      status: true,
      briCategory: true,
      estimatedHours: true,
      rawImpact: true,
    }
  })

  const summary = {
    totalTasks: tasks.length,
    pendingTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalEstimatedHours: 0,
    completedHours: 0,
    estimatedValueImpact: 0,
    completedValueImpact: 0,
    tasksByCategory: {} as Record<string, number>,
  }

  for (const task of tasks) {
    // Status counts
    if (task.status === 'PENDING') summary.pendingTasks++
    else if (task.status === 'COMPLETED') summary.completedTasks++
    else if (task.status === 'IN_PROGRESS') summary.inProgressTasks++

    // Hours
    if (task.estimatedHours) {
      summary.totalEstimatedHours += task.estimatedHours
      if (task.status === 'COMPLETED') {
        summary.completedHours += task.estimatedHours
      }
    }

    // Value impact
    const impact = Number(task.rawImpact) || 0
    summary.estimatedValueImpact += impact
    if (task.status === 'COMPLETED') {
      summary.completedValueImpact += impact
    }

    // Category counts
    summary.tasksByCategory[task.briCategory] =
      (summary.tasksByCategory[task.briCategory] || 0) + 1
  }

  return summary
}

/**
 * Get 30-90 day action plan for a company
 * Groups tasks by timebox and priority
 */
export async function get3090DayActionPlan(companyId: string): Promise<{
  immediate: Array<{ id: string; title: string; briCategory: BriCategory; estimatedHours: number | null }>
  near: Array<{ id: string; title: string; briCategory: BriCategory; estimatedHours: number | null }>
  totalTasks: number
  totalHours: number
}> {
  // Get pending and in-progress tasks
  const tasks = await prisma.task.findMany({
    where: {
      companyId,
      status: { in: ['PENDING', 'IN_PROGRESS'] }
    },
    orderBy: { normalizedValue: 'desc' },
    select: {
      id: true,
      title: true,
      briCategory: true,
      estimatedHours: true,
      normalizedValue: true,
    }
  })

  // Split into immediate (first 5) and near term (next 10)
  const immediate = tasks.slice(0, 5)
  const near = tasks.slice(5, 15)

  const totalHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)

  return {
    immediate,
    near,
    totalTasks: tasks.length,
    totalHours,
  }
}
