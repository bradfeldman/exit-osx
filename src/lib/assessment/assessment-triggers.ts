/**
 * Assessment Trigger System
 *
 * Determines when new 10-minute Risk Assessments should be generated.
 *
 * Triggers:
 * 1. Action Plan threshold - When open tasks reach 5 items
 * 2. Weekly fallback - If no assessment in the past 7 days
 * 3. Manual trigger - User explicitly requests (handled elsewhere)
 *
 * Constraints:
 * - Initial assessment must be completed first
 * - Maximum 1 open (incomplete) assessment at a time
 */

import { prisma } from '@/lib/prisma'

// Configuration constants
const ACTION_PLAN_THRESHOLD = 5 // Trigger when open tasks reach this count
const WEEKLY_TRIGGER_DAYS = 7 // Days before weekly fallback triggers

export interface AssessmentTriggerResult {
  shouldCreate: boolean
  reason: 'ACTION_PLAN_THRESHOLD' | 'WEEKLY_FALLBACK' | 'NONE'
  message: string
  canCreate: boolean // Whether conditions allow creation
  blockedReason?: string
}

export interface AssessmentStatus {
  hasInitialAssessment: boolean
  hasOpenAssessment: boolean
  openAssessmentId?: string
  lastAssessmentDate?: Date
  daysSinceLastAssessment?: number
  openTaskCount: number
  totalTaskCount: number
}

/**
 * Get current assessment status for a company
 */
export async function getAssessmentStatus(companyId: string): Promise<AssessmentStatus & { hasAvailableQuestions: boolean }> {
  // Check for completed initial assessment
  const initialAssessment = await prisma.assessment.findFirst({
    where: {
      companyId,
      completedAt: { not: null }
    }
  })

  // Check for open project assessment (not completed)
  const openAssessment = await prisma.projectAssessment.findFirst({
    where: {
      companyId,
      status: 'IN_PROGRESS'
    }
  })

  // Get the most recent completed project assessment
  const lastCompletedAssessment = await prisma.projectAssessment.findFirst({
    where: {
      companyId,
      status: 'COMPLETED'
    },
    orderBy: { completedAt: 'desc' }
  })

  // Count open tasks (PENDING or IN_PROGRESS, not COMPLETED/CANCELLED/DEFERRED)
  const openTaskCount = await prisma.task.count({
    where: {
      companyId,
      status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }
    }
  })

  const totalTaskCount = await prisma.task.count({
    where: {
      companyId,
      status: { not: 'CANCELLED' }
    }
  })

  // Calculate days since last assessment
  let daysSinceLastAssessment: number | undefined
  if (lastCompletedAssessment?.completedAt) {
    const now = new Date()
    const lastDate = new Date(lastCompletedAssessment.completedAt)
    daysSinceLastAssessment = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Check if there are questions available that haven't been asked yet
  // Get all answered question IDs for this company
  const answeredQuestionIds = await prisma.projectAssessmentResponse.findMany({
    where: {
      assessment: { companyId }
    },
    select: { questionId: true }
  })
  const answeredIds = new Set(answeredQuestionIds.map(r => r.questionId))

  // Count total project questions vs answered
  const totalQuestions = await prisma.projectQuestion.count({
    where: { isActive: true }
  })
  const hasAvailableQuestions = answeredIds.size < totalQuestions

  return {
    hasInitialAssessment: !!initialAssessment,
    hasOpenAssessment: !!openAssessment,
    openAssessmentId: openAssessment?.id,
    lastAssessmentDate: lastCompletedAssessment?.completedAt ?? undefined,
    daysSinceLastAssessment,
    openTaskCount,
    totalTaskCount,
    hasAvailableQuestions
  }
}

/**
 * Check if a new assessment should be triggered for a company
 */
export async function checkAssessmentTriggers(companyId: string): Promise<AssessmentTriggerResult> {
  const status = await getAssessmentStatus(companyId)

  // Constraint: Must have completed initial assessment
  if (!status.hasInitialAssessment) {
    return {
      shouldCreate: false,
      reason: 'NONE',
      message: 'Initial assessment not completed',
      canCreate: false,
      blockedReason: 'INITIAL_ASSESSMENT_REQUIRED'
    }
  }

  // Constraint: Cannot have an open assessment
  if (status.hasOpenAssessment) {
    return {
      shouldCreate: false,
      reason: 'NONE',
      message: 'An assessment is already in progress',
      canCreate: false,
      blockedReason: 'ASSESSMENT_IN_PROGRESS'
    }
  }

  // Constraint: Must have available questions
  if (!status.hasAvailableQuestions) {
    return {
      shouldCreate: false,
      reason: 'NONE',
      message: 'All available questions have been answered',
      canCreate: false,
      blockedReason: 'NO_AVAILABLE_QUESTIONS'
    }
  }

  // Trigger 1: Action Plan threshold
  // When tasks are completed and open count drops to threshold
  // But only if at least some time has passed since last assessment (respect weekly cadence)
  const daysSinceLast = status.daysSinceLastAssessment ?? Infinity
  if (status.openTaskCount <= ACTION_PLAN_THRESHOLD && status.totalTaskCount > 0 && daysSinceLast >= WEEKLY_TRIGGER_DAYS) {
    return {
      shouldCreate: true,
      reason: 'ACTION_PLAN_THRESHOLD',
      message: `Action plan has ${status.openTaskCount} open items - time to reassess`,
      canCreate: true
    }
  }

  // Trigger 2: Weekly fallback
  // Also trigger if this is the first week after initial assessment and no project assessment yet
  const isFirstWeekWithoutAssessment = status.daysSinceLastAssessment === undefined && status.hasInitialAssessment
  if ((status.daysSinceLastAssessment !== undefined &&
      status.daysSinceLastAssessment >= WEEKLY_TRIGGER_DAYS) || isFirstWeekWithoutAssessment) {
    const daysMessage = status.daysSinceLastAssessment !== undefined
      ? `${status.daysSinceLastAssessment} days since last assessment`
      : 'Weekly assessment available'
    return {
      shouldCreate: true,
      reason: 'WEEKLY_FALLBACK',
      message: daysMessage,
      canCreate: true
    }
  }

  // No trigger conditions met
  return {
    shouldCreate: false,
    reason: 'NONE',
    message: 'No assessment needed at this time',
    canCreate: true // Can still manually create
  }
}

/**
 * Create a new project assessment if conditions are met
 * Returns the assessment ID if created, null otherwise
 */
export async function createAssessmentIfTriggered(
  companyId: string,
  forceCreate: boolean = false
): Promise<{ created: boolean; assessmentId?: string; reason?: string; error?: string }> {
  const triggerResult = await checkAssessmentTriggers(companyId)

  // If forced creation, only check if we CAN create (not if we SHOULD)
  if (!forceCreate && !triggerResult.shouldCreate) {
    return {
      created: false,
      reason: triggerResult.message
    }
  }

  if (!triggerResult.canCreate) {
    return {
      created: false,
      error: triggerResult.blockedReason
    }
  }

  try {
    // Get the next assessment number
    const lastAssessment = await prisma.projectAssessment.findFirst({
      where: { companyId },
      orderBy: { assessmentNumber: 'desc' }
    })
    const nextNumber = (lastAssessment?.assessmentNumber ?? 0) + 1

    // Create the assessment
    const assessment = await prisma.projectAssessment.create({
      data: {
        companyId,
        assessmentNumber: nextNumber,
        status: 'IN_PROGRESS',
        title: `10-Minute Assessment #${nextNumber}`
      }
    })

    // Note: Question selection is handled by /api/project-assessments POST endpoint
    // This function just creates the shell

    return {
      created: true,
      assessmentId: assessment.id,
      reason: triggerResult.reason
    }
  } catch (error) {
    console.error('Error creating triggered assessment:', error)
    return {
      created: false,
      error: error instanceof Error ? error.message : 'Failed to create assessment'
    }
  }
}

/**
 * Get pending assessment alert info for a company
 */
export async function getAssessmentAlertInfo(companyId: string): Promise<{
  hasAlert: boolean
  alertType?: 'OPEN_ASSESSMENT' | 'ASSESSMENT_AVAILABLE'
  assessmentId?: string
  message?: string
}> {
  const status = await getAssessmentStatus(companyId)

  // Alert for open assessment that needs completion
  if (status.hasOpenAssessment) {
    return {
      hasAlert: true,
      alertType: 'OPEN_ASSESSMENT',
      assessmentId: status.openAssessmentId,
      message: 'You have an incomplete assessment'
    }
  }

  // Check if conditions warrant a new assessment
  const triggerResult = await checkAssessmentTriggers(companyId)
  if (triggerResult.shouldCreate) {
    return {
      hasAlert: true,
      alertType: 'ASSESSMENT_AVAILABLE',
      message: triggerResult.message
    }
  }

  return { hasAlert: false }
}
