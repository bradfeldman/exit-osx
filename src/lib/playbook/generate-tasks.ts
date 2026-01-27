// Task generation service
// Analyzes assessment responses and creates prioritized tasks
// Uses Answer Upgrade System: tasks upgrade effective answers to improve BRI
// Uses Issue Tier System: value allocation based on M&A buyer risk (60/30/10)

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getTemplatesForQuestion } from './task-templates'
import { type RichTaskDescription } from './rich-task-description'
import { calculateTaskPriorityFromAttributes, initializeActionPlan } from '@/lib/tasks/action-plan'

// Use flexible types to handle Prisma Decimal
type NumberLike = string | number | { toString(): string }

// Issue tier types matching the Prisma enum
type IssueTier = 'CRITICAL' | 'SIGNIFICANT' | 'OPTIMIZATION'

// Value gap allocation by tier (based on M&A buyer risk analysis)
const TIER_ALLOCATION: Record<IssueTier, number> = {
  CRITICAL: 0.60,      // Deal killers get 60% of value gap
  SIGNIFICANT: 0.30,   // Major value impact gets 30%
  OPTIMIZATION: 0.10,  // Nice to have gets 10%
}

interface AssessmentResponse {
  questionId: string
  selectedOptionId: string
  question: {
    id: string
    questionText: string
    briCategory: string
    issueTier: IssueTier
    maxImpactPoints: NumberLike
  }
  selectedOption: {
    id: string
    scoreValue: NumberLike
  }
}

interface ValuationSnapshot {
  valueGap: NumberLike
  briScore: NumberLike
}

interface TaskToCreate {
  title: string
  description: string
  richDescription?: RichTaskDescription
  actionType: string
  briCategory: string
  linkedQuestionId: string
  upgradesFromOptionId: string
  upgradesToOptionId: string
  estimatedValueImpact: number // Estimated value for display purposes
  effectiveTier: IssueTier     // The tier this task was calculated at
  effortLevel: string
  complexity: string
  estimatedHours?: number
}

/**
 * Calculate the effective tier based on question's max tier and current answer score
 * The answer can only REDUCE severity, never increase it:
 * - CRITICAL question + poor answer (0-0.33) → CRITICAL
 * - CRITICAL question + medium answer (0.34-0.66) → SIGNIFICANT
 * - CRITICAL question + good answer (0.67-0.99) → OPTIMIZATION
 * - Any question + perfect answer (1.0) → No task needed
 */
function getEffectiveTier(questionTier: IssueTier, answerScore: number): IssueTier {
  if (questionTier === 'CRITICAL') {
    if (answerScore <= 0.33) return 'CRITICAL'
    if (answerScore <= 0.66) return 'SIGNIFICANT'
    return 'OPTIMIZATION'
  }

  if (questionTier === 'SIGNIFICANT') {
    if (answerScore <= 0.50) return 'SIGNIFICANT'
    return 'OPTIMIZATION'
  }

  // OPTIMIZATION questions stay OPTIMIZATION regardless of score
  return 'OPTIMIZATION'
}

export async function generateTasksForCompany(
  companyId: string,
  responses: AssessmentResponse[],
  snapshot: ValuationSnapshot
): Promise<{ created: number; skipped: number }> {
  const valueGap = Number(snapshot.valueGap)

  // Clear existing pending tasks for this company
  await prisma.task.deleteMany({
    where: {
      companyId,
      status: 'PENDING',
    },
  })

  // Check if there's only one user in the company's organization - auto-assign tasks to them
  let defaultAssigneeId: string | null = null
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  })

  if (company) {
    const orgUsers = await prisma.organizationUser.findMany({
      where: { organizationId: company.organizationId },
      select: { userId: true },
    })

    if (orgUsers.length === 1) {
      defaultAssigneeId = orgUsers[0].userId
    }
  }

  // Count questions by effective tier (for proper allocation within tiers)
  // A question's effective tier depends on both its max tier AND the answer score
  const tierQuestionCounts: Record<IssueTier, number> = {
    CRITICAL: 0,
    SIGNIFICANT: 0,
    OPTIMIZATION: 0,
  }

  for (const response of responses) {
    const currentScore = Number(response.selectedOption.scoreValue)
    // Only count questions that aren't perfectly answered (score < 1.0)
    if (currentScore < 1.0) {
      const effectiveTier = getEffectiveTier(response.question.issueTier, currentScore)
      tierQuestionCounts[effectiveTier]++
    }
  }

  console.log('[TASK_ENGINE] Questions by effective tier:', tierQuestionCounts)

  // PERFORMANCE: Batch fetch all question options upfront to avoid N+1 queries
  const questionIds = responses.map(r => r.questionId)
  const allOptions = await prisma.questionOption.findMany({
    where: { questionId: { in: questionIds } },
    orderBy: { scoreValue: 'asc' }
  })

  // Create lookup map for options by questionId
  const optionsByQuestionId = new Map<string, typeof allOptions>()
  for (const option of allOptions) {
    const existing = optionsByQuestionId.get(option.questionId) || []
    existing.push(option)
    optionsByQuestionId.set(option.questionId, existing)
  }

  // Collect all tasks with upgrade mappings
  const tasksToCreate: TaskToCreate[] = []
  let skipped = 0

  for (const response of responses) {
    const currentScore = Number(response.selectedOption.scoreValue)
    const questionId = response.questionId
    const questionTier = response.question.issueTier

    // Calculate effective tier for this question based on answer
    const effectiveTier = getEffectiveTier(questionTier, currentScore)

    // Get all options for this question from pre-fetched map
    const options = optionsByQuestionId.get(questionId) || []

    // Get matching templates
    const templates = getTemplatesForQuestion(response.question.questionText)

    for (const template of templates) {
      // Only generate tasks if score is below threshold
      if (currentScore >= template.scoreThreshold) {
        skipped++
        continue
      }

      for (const taskDef of template.tasks) {
        // Check if user's current score matches this task's upgradeFromScore (with tolerance)
        const scoreTolerance = 0.05
        if (Math.abs(currentScore - taskDef.upgradeFromScore) > scoreTolerance) {
          // User's score doesn't match this task's starting point
          continue
        }

        // Find the upgrade-from option (should be user's current selection)
        const fromOption = options.find(
          o => Math.abs(Number(o.scoreValue) - taskDef.upgradeFromScore) <= scoreTolerance
        )

        // Find the upgrade-to option
        const toOption = options.find(
          o => Math.abs(Number(o.scoreValue) - taskDef.upgradeToScore) <= scoreTolerance
        )

        if (!fromOption || !toOption) {
          console.log(`[TASK_ENGINE] Could not find upgrade options for task: ${taskDef.title}`)
          skipped++
          continue
        }

        // Calculate estimated value impact using TIER-BASED allocation
        // Value = (tier allocation × value gap) / questions in tier × score improvement factor
        const tierAllocation = TIER_ALLOCATION[effectiveTier]
        const questionsInTier = tierQuestionCounts[effectiveTier] || 1
        const scoreImprovement = taskDef.upgradeToScore - taskDef.upgradeFromScore

        // Each question in a tier gets an equal share of that tier's allocation
        // Score improvement factor scales based on how much the task moves the needle
        const estimatedValueImpact = (tierAllocation * valueGap / questionsInTier) * scoreImprovement

        tasksToCreate.push({
          title: taskDef.title,
          description: taskDef.description,
          richDescription: taskDef.richDescription,
          actionType: taskDef.actionType,
          briCategory: template.briCategory,
          linkedQuestionId: questionId,
          upgradesFromOptionId: fromOption.id,
          upgradesToOptionId: toOption.id,
          estimatedValueImpact,
          effectiveTier,
          effortLevel: taskDef.effortLevel,
          complexity: taskDef.complexity,
          estimatedHours: taskDef.estimatedHours,
        })
      }
    }
  }

  // Create tasks with upgrade mappings
  let created = 0

  for (const task of tasksToCreate) {
    // Use estimated value as rawImpact for display/sorting purposes
    const rawImpact = task.estimatedValueImpact

    // Normalize value based on effort (ROI-like metric for prioritization)
    const effortMultiplier = getEffortMultiplier(task.effortLevel)
    const normalizedValue = rawImpact / effortMultiplier

    try {
      // Calculate priority based on the 25-level matrix
      // Lower score = more room for improvement = higher impact
      const scoreForPriority = tasksToCreate.indexOf(task) < tasksToCreate.length
        ? (tasksToCreate.indexOf(task) / tasksToCreate.length) * 0.5 // Spread scores
        : 0.5
      const { impactLevel, difficultyLevel, priorityRank } = calculateTaskPriorityFromAttributes(
        scoreForPriority,
        task.effortLevel,
        task.estimatedHours
      )

      await prisma.task.create({
        data: {
          companyId,
          title: task.title,
          description: task.description,
          ...(task.richDescription && { richDescription: task.richDescription as unknown as Prisma.InputJsonValue }),
          actionType: task.actionType as never,
          briCategory: task.briCategory as never,
          linkedQuestionId: task.linkedQuestionId,
          upgradesFromOptionId: task.upgradesFromOptionId,
          upgradesToOptionId: task.upgradesToOptionId,
          rawImpact,
          normalizedValue,
          issueTier: task.effectiveTier,
          effortLevel: task.effortLevel as never,
          complexity: task.complexity as never,
          estimatedHours: task.estimatedHours,
          impactLevel,
          difficultyLevel,
          priorityRank,
          inActionPlan: false, // Tasks start in queue, not action plan
          ...(defaultAssigneeId && { primaryAssigneeId: defaultAssigneeId }),
          status: 'PENDING',
        },
      })
      created++
    } catch (error) {
      console.error('Error creating task:', error)
      skipped++
    }
  }

  // Initialize action plan with top 15 priority tasks
  const actionPlanResult = await initializeActionPlan(companyId)

  console.log(`[TASK_ENGINE] Generated ${created} tasks for company ${companyId}`)
  console.log(`[TASK_ENGINE] Action plan: ${actionPlanResult.initialized} tasks, Queue: ${actionPlanResult.queued} tasks`)
  console.log(`[TASK_ENGINE] Using Issue Tier System (60/30/10) + Answer Upgrade System + Priority Matrix`)

  return { created, skipped }
}

/**
 * Generate next-level tasks for a question after a task is completed
 * Called when a task upgrades an answer - checks if there's a next-level task available
 */
export async function generateNextLevelTasks(
  companyId: string,
  questionId: string
): Promise<{ created: number }> {
  // Check if there's only one user in the company's organization - auto-assign tasks to them
  let defaultAssigneeId: string | null = null
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  })

  if (company) {
    const orgUsers = await prisma.organizationUser.findMany({
      where: { organizationId: company.organizationId },
      select: { userId: true },
    })

    if (orgUsers.length === 1) {
      defaultAssigneeId = orgUsers[0].userId
    }
  }

  // Get the latest assessment response for this question (with effective option)
  const response = await prisma.assessmentResponse.findFirst({
    where: {
      questionId,
      assessment: {
        companyId,
        completedAt: { not: null }
      }
    },
    orderBy: { assessment: { completedAt: 'desc' } },
    include: {
      question: true,
      effectiveOption: true
    }
  })

  if (!response || !response.effectiveOption) {
    return { created: 0 }
  }

  const currentEffectiveScore = Number(response.effectiveOption.scoreValue)
  const questionTier = (response.question.issueTier || 'OPTIMIZATION') as IssueTier

  // If already at max score, no more tasks needed
  if (currentEffectiveScore >= 1.0) {
    return { created: 0 }
  }

  // Calculate effective tier based on new score
  const effectiveTier = getEffectiveTier(questionTier, currentEffectiveScore)

  // Get all options for this question
  const options = await prisma.questionOption.findMany({
    where: { questionId },
    orderBy: { scoreValue: 'asc' }
  })

  // Get matching templates
  const templates = getTemplatesForQuestion(response.question.questionText)

  let created = 0
  const scoreTolerance = 0.05

  for (const template of templates) {
    for (const taskDef of template.tasks) {
      // Check if there's a task that starts from the user's current effective score
      if (Math.abs(currentEffectiveScore - taskDef.upgradeFromScore) > scoreTolerance) {
        continue
      }

      // Check if this task already exists for this company
      const existingTask = await prisma.task.findFirst({
        where: {
          companyId,
          title: taskDef.title,
          linkedQuestionId: questionId,
          status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] }
        }
      })

      if (existingTask) {
        continue // Task already exists
      }

      // Find upgrade options
      const fromOption = options.find(
        o => Math.abs(Number(o.scoreValue) - taskDef.upgradeFromScore) <= scoreTolerance
      )
      const toOption = options.find(
        o => Math.abs(Number(o.scoreValue) - taskDef.upgradeToScore) <= scoreTolerance
      )

      if (!fromOption || !toOption) {
        continue
      }

      // Get value gap for estimation
      const snapshot = await prisma.valuationSnapshot.findFirst({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: { valueGap: true }
      })
      const valueGap = snapshot ? Number(snapshot.valueGap) : 0

      // Calculate estimated value impact using tier-based allocation
      // For next-level tasks, we use a simplified calculation (1 question in tier)
      const tierAllocation = TIER_ALLOCATION[effectiveTier]
      const scoreImprovement = taskDef.upgradeToScore - taskDef.upgradeFromScore
      const estimatedValueImpact = tierAllocation * valueGap * scoreImprovement

      const effortMultiplier = getEffortMultiplier(taskDef.effortLevel)
      const normalizedValue = estimatedValueImpact / effortMultiplier

      try {
        // Calculate priority for next-level task
        const { impactLevel, difficultyLevel, priorityRank } = calculateTaskPriorityFromAttributes(
          currentEffectiveScore,
          taskDef.effortLevel,
          taskDef.estimatedHours
        )

        await prisma.task.create({
          data: {
            companyId,
            title: taskDef.title,
            description: taskDef.description,
            actionType: taskDef.actionType as never,
            briCategory: template.briCategory as never,
            linkedQuestionId: questionId,
            upgradesFromOptionId: fromOption.id,
            upgradesToOptionId: toOption.id,
            rawImpact: estimatedValueImpact,
            normalizedValue,
            issueTier: effectiveTier,
            effortLevel: taskDef.effortLevel as never,
            complexity: taskDef.complexity as never,
            estimatedHours: taskDef.estimatedHours,
            impactLevel,
            difficultyLevel,
            priorityRank,
            inActionPlan: false, // Goes to queue first
            status: 'PENDING',
            ...(defaultAssigneeId && { primaryAssigneeId: defaultAssigneeId }),
          },
        })
        created++
        console.log(`[TASK_ENGINE] Generated next-level task: ${taskDef.title} (${effectiveTier}, priority ${priorityRank})`)
      } catch (error) {
        console.error('Error creating next-level task:', error)
      }
    }
  }

  return { created }
}

/**
 * Renormalize task values for a company after changes
 * Note: With Answer Upgrade System, this is less critical since actual value
 * flows through BRI recalculation. This is kept for backward compatibility
 * and display purposes.
 */
export async function renormalizeTaskValues(
  companyId: string,
  newValueGap?: number
): Promise<{ updated: number; newTotalValue: number }> {
  // Get current value gap from latest snapshot if not provided
  let valueGap = newValueGap
  if (valueGap === undefined) {
    const snapshot = await prisma.valuationSnapshot.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { valueGap: true }
    })
    valueGap = snapshot ? Number(snapshot.valueGap) : 0
  }

  // Get all active (non-completed, non-cancelled) tasks
  const activeTasks = await prisma.task.findMany({
    where: {
      companyId,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] }
    },
    select: {
      id: true,
      rawImpact: true,
      effortLevel: true
    }
  })

  if (activeTasks.length === 0) {
    return { updated: 0, newTotalValue: 0 }
  }

  // Calculate total current raw impact
  const totalCurrentImpact = activeTasks.reduce(
    (sum, t) => sum + Number(t.rawImpact),
    0
  )

  // Renormalize each active task proportionally to new value gap
  let updated = 0
  for (const task of activeTasks) {
    const currentImpact = Number(task.rawImpact)

    // Calculate new raw impact proportionally
    const newRawImpact = totalCurrentImpact > 0
      ? (currentImpact / totalCurrentImpact) * valueGap
      : valueGap / activeTasks.length

    const effortMultiplier = getEffortMultiplier(task.effortLevel)
    const newNormalizedValue = newRawImpact / effortMultiplier

    await prisma.task.update({
      where: { id: task.id },
      data: {
        rawImpact: newRawImpact,
        normalizedValue: newNormalizedValue
      }
    })
    updated++
  }

  console.log(`[TASK_ENGINE] Renormalized ${updated} tasks for company ${companyId}`)
  console.log(`[TASK_ENGINE] New value gap: ${valueGap.toFixed(2)}`)

  return { updated, newTotalValue: valueGap }
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

/**
 * Generate tasks from project assessment responses
 * Called when a 10-minute assessment is completed
 *
 * @returns Number of tasks created and added to queue
 */
export async function generateTasksFromProjectAssessment(
  companyId: string,
  assessmentId: string
): Promise<{ created: number; skipped: number }> {
  // Check if there's only one user in the company's organization - auto-assign tasks to them
  let defaultAssigneeId: string | null = null
  const companyForAssignee = await prisma.company.findUnique({
    where: { id: companyId },
    select: { organizationId: true },
  })

  if (companyForAssignee) {
    const orgUsers = await prisma.organizationUser.findMany({
      where: { organizationId: companyForAssignee.organizationId },
      select: { userId: true },
    })

    if (orgUsers.length === 1) {
      defaultAssigneeId = orgUsers[0].userId
    }
  }

  // Get the assessment with responses
  const assessment = await prisma.projectAssessment.findUnique({
    where: { id: assessmentId },
    include: {
      responses: {
        include: {
          question: {
            include: { options: true }
          },
          selectedOption: true,
        }
      }
    }
  })

  if (!assessment) {
    console.error('[TASK_ENGINE] Assessment not found:', assessmentId)
    return { created: 0, skipped: 0 }
  }

  // Get the current value gap for estimating task value
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { valueGap: true }
  })
  const valueGap = snapshot ? Number(snapshot.valueGap) : 0

  let created = 0
  let skipped = 0

  for (const response of assessment.responses) {
    const score = Number(response.actualScore)
    const question = response.question

    // Only create tasks for low-scoring responses (score < 0.5)
    if (score >= 0.5) {
      skipped++
      continue
    }

    // Generate the task title for duplicate checking
    const taskTitle = `Improve: ${question.subCategory}`

    // Check if a task already exists for this question OR with the same title
    // (prevents duplicate "Improve: Exit Timeline" when multiple questions share the same subCategory)
    const existingTask = await prisma.task.findFirst({
      where: {
        companyId,
        OR: [
          { linkedQuestionId: question.id },
          { title: taskTitle }
        ],
        status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] }
      }
    })

    if (existingTask) {
      skipped++
      continue
    }

    // Find the next better option (upgrade target)
    const currentScore = Number(response.selectedOption.scoreValue)
    const betterOptions = question.options.filter(
      o => Number(o.scoreValue) > currentScore
    ).sort((a, b) => Number(a.scoreValue) - Number(b.scoreValue))

    if (betterOptions.length === 0) {
      skipped++
      continue
    }

    // Target the next step up, not necessarily the best option
    const targetOption = betterOptions[0]

    // Calculate task attributes
    const scoreImprovement = Number(targetOption.scoreValue) - currentScore
    const estimatedValueImpact = valueGap * scoreImprovement * 0.1 // 10% allocation per question

    // Determine effort level based on score improvement needed
    let effortLevel = 'MODERATE'
    let estimatedHours = 8
    if (scoreImprovement <= 0.25) {
      effortLevel = 'LOW'
      estimatedHours = 4
    } else if (scoreImprovement <= 0.5) {
      effortLevel = 'MODERATE'
      estimatedHours = 8
    } else {
      effortLevel = 'HIGH'
      estimatedHours = 16
    }

    // Calculate priority
    const { impactLevel, difficultyLevel, priorityRank } = calculateTaskPriorityFromAttributes(
      score,
      effortLevel,
      estimatedHours
    )

    const effortMultiplier = getEffortMultiplier(effortLevel)
    const normalizedValue = estimatedValueImpact / effortMultiplier

    try {
      await prisma.task.create({
        data: {
          companyId,
          title: taskTitle,
          description: `Address the ${question.briCategory.toLowerCase()} issue identified in assessment: ${question.questionText}\n\nCurrent situation: ${response.selectedOption.optionText}\nTarget: ${targetOption.optionText}`,
          actionType: 'TYPE_III_OPERATIONAL',
          briCategory: question.briCategory as never,
          linkedQuestionId: question.id,
          rawImpact: estimatedValueImpact,
          normalizedValue,
          effortLevel: effortLevel as never,
          complexity: 'MODERATE' as never,
          estimatedHours,
          impactLevel,
          difficultyLevel,
          priorityRank,
          inActionPlan: false, // Goes to queue first
          status: 'PENDING',
          ...(defaultAssigneeId && { primaryAssigneeId: defaultAssigneeId }),
        }
      })
      created++
      console.log(`[TASK_ENGINE] Created task for question: ${question.subCategory} (priority ${priorityRank})`)
    } catch (error) {
      console.error('[TASK_ENGINE] Error creating task:', error)
      skipped++
    }
  }

  console.log(`[TASK_ENGINE] Project assessment generated ${created} tasks, skipped ${skipped}`)

  return { created, skipped }
}
