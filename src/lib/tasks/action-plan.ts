/**
 * Action Plan Management
 *
 * Manages the visible action plan (up to 15 tasks) and the task queue.
 * Tasks are prioritized using the 25-level Impact/Difficulty matrix.
 */

import { prisma } from '@/lib/prisma'
import { ImpactLevel, DifficultyLevel } from '@prisma/client'
import {
  MAX_ACTION_PLAN_TASKS,
  calculatePriorityRank,
  scoreToImpactLevel,
  effortToDifficultyLevel,
} from './priority-matrix'

/**
 * Update a task's priority fields based on impact and difficulty
 */
export async function updateTaskPriority(
  taskId: string,
  impactLevel: ImpactLevel,
  difficultyLevel: DifficultyLevel
): Promise<void> {
  const priorityRank = calculatePriorityRank(impactLevel, difficultyLevel)

  await prisma.task.update({
    where: { id: taskId },
    data: {
      impactLevel,
      difficultyLevel,
      priorityRank,
    },
  })
}

/**
 * Get the current action plan for a company (tasks with inActionPlan: true)
 */
export async function getActionPlan(companyId: string) {
  return prisma.task.findMany({
    where: {
      companyId,
      inActionPlan: true,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] },
    },
    orderBy: { priorityRank: 'asc' },
  })
}

/**
 * Get queued tasks (not in action plan) for a company
 */
export async function getQueuedTasks(companyId: string) {
  return prisma.task.findMany({
    where: {
      companyId,
      inActionPlan: false,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'DEFERRED', 'NOT_APPLICABLE'] },
    },
    orderBy: { priorityRank: 'asc' },
  })
}

/**
 * Get count of tasks currently in the action plan
 */
export async function getActionPlanCount(companyId: string): Promise<number> {
  return prisma.task.count({
    where: {
      companyId,
      inActionPlan: true,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] },
    },
  })
}

/**
 * Update the action plan - fill up to MAX_ACTION_PLAN_TASKS from the queue
 * Keeps existing non-completed/non-deferred tasks and adds new ones from queue
 *
 * @returns Number of tasks added to the action plan
 */
export async function updateActionPlan(companyId: string): Promise<{
  added: number
  total: number
  message: string
}> {
  // Get current count of tasks in action plan (active tasks)
  const currentCount = await prisma.task.count({
    where: {
      companyId,
      inActionPlan: true,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] },
    },
  })

  // Calculate how many slots are available
  const slotsAvailable = MAX_ACTION_PLAN_TASKS - currentCount

  if (slotsAvailable <= 0) {
    return {
      added: 0,
      total: currentCount,
      message: `Action plan is full with ${currentCount} tasks`,
    }
  }

  // Get queued tasks sorted by priority
  const queuedTasks = await prisma.task.findMany({
    where: {
      companyId,
      inActionPlan: false,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'DEFERRED', 'NOT_APPLICABLE'] },
    },
    orderBy: { priorityRank: 'asc' },
    take: slotsAvailable,
  })

  if (queuedTasks.length === 0) {
    return {
      added: 0,
      total: currentCount,
      message: 'No queued tasks available to add',
    }
  }

  // Move tasks from queue to action plan
  const taskIds = queuedTasks.map((t) => t.id)
  await prisma.task.updateMany({
    where: { id: { in: taskIds } },
    data: { inActionPlan: true },
  })

  const newTotal = currentCount + queuedTasks.length

  return {
    added: queuedTasks.length,
    total: newTotal,
    message: `Added ${queuedTasks.length} task(s) to action plan`,
  }
}

/**
 * Initialize action plan for a company - set the top priority tasks
 * Called after initial task generation
 */
export async function initializeActionPlan(companyId: string): Promise<{
  initialized: number
  queued: number
}> {
  // First, reset all tasks to not in action plan
  await prisma.task.updateMany({
    where: { companyId },
    data: { inActionPlan: false },
  })

  // Get all active tasks sorted by priority
  const allTasks = await prisma.task.findMany({
    where: {
      companyId,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'DEFERRED', 'NOT_APPLICABLE'] },
    },
    orderBy: { priorityRank: 'asc' },
  })

  // Split into action plan (top 15) and queue (rest)
  const actionPlanTasks = allTasks.slice(0, MAX_ACTION_PLAN_TASKS)
  const queuedTasks = allTasks.slice(MAX_ACTION_PLAN_TASKS)

  // Mark top tasks as in action plan
  if (actionPlanTasks.length > 0) {
    const taskIds = actionPlanTasks.map((t) => t.id)
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { inActionPlan: true },
    })
  }

  return {
    initialized: actionPlanTasks.length,
    queued: queuedTasks.length,
  }
}

/**
 * Remove a task from the action plan (move back to queue)
 */
export async function removeFromActionPlan(taskId: string): Promise<void> {
  await prisma.task.update({
    where: { id: taskId },
    data: { inActionPlan: false },
  })
}

/**
 * When a task is completed/cancelled/deferred, it's automatically removed from action plan
 * This function can optionally auto-fill from queue
 */
export async function onTaskStatusChange(
  taskId: string,
  newStatus: string,
  autoFill: boolean = false
): Promise<{ removed: boolean; autoFilled: number }> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { companyId: true, inActionPlan: true },
  })

  if (!task) {
    return { removed: false, autoFilled: 0 }
  }

  let removed = false
  let autoFilled = 0

  // If task was in action plan and is being completed/cancelled/deferred/not applicable
  if (task.inActionPlan && ['COMPLETED', 'CANCELLED', 'DEFERRED', 'NOT_APPLICABLE'].includes(newStatus)) {
    // Task is automatically "removed" by status change
    removed = true

    // Optionally auto-fill from queue
    if (autoFill) {
      const result = await updateActionPlan(task.companyId)
      autoFilled = result.added
    }
  }

  return { removed, autoFilled }
}

/**
 * Generate a new action plan with specified options
 *
 * @param companyId - The company to generate the plan for
 * @param dueDate - Target completion date for the action plan
 * @param carryForward - Whether to keep existing non-completed tasks
 * @param defaultAssigneeId - Default user to assign tasks to (if not already assigned)
 */
export async function generateActionPlan(
  companyId: string,
  dueDate: Date,
  carryForward: boolean,
  defaultAssigneeId?: string | null
): Promise<{
  success: boolean
  tasksInPlan: number
  tasksCarriedForward: number
  newTasksAdded: number
  message: string
}> {
  // Get current non-completed tasks in action plan
  const currentTasks = await prisma.task.findMany({
    where: {
      companyId,
      inActionPlan: true,
      status: { notIn: ['COMPLETED', 'CANCELLED', 'NOT_APPLICABLE'] },
    },
    select: { id: true, primaryAssigneeId: true },
  })

  let tasksCarriedForward = 0
  let tasksReturnedToPool = 0

  if (carryForward) {
    // Keep existing tasks, update their due dates and assign if needed
    tasksCarriedForward = currentTasks.length

    if (currentTasks.length > 0) {
      // Update due dates for carried forward tasks
      // Also assign to default user if not already assigned
      for (const task of currentTasks) {
        const updateData: { dueDate: Date; primaryAssigneeId?: string } = { dueDate }
        if (!task.primaryAssigneeId && defaultAssigneeId) {
          updateData.primaryAssigneeId = defaultAssigneeId
        }
        await prisma.task.update({
          where: { id: task.id },
          data: updateData,
        })
      }
    }
  } else {
    // Move current tasks back to the pool
    if (currentTasks.length > 0) {
      const taskIds = currentTasks.map(t => t.id)
      await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: { inActionPlan: false, dueDate: null },
      })
      tasksReturnedToPool = currentTasks.length
    }
  }

  // Calculate how many slots are available
  const currentCount = carryForward ? tasksCarriedForward : 0
  const slotsAvailable = MAX_ACTION_PLAN_TASKS - currentCount

  let newTasksAdded = 0

  if (slotsAvailable > 0) {
    // Get queued tasks sorted by priority
    const queuedTasks = await prisma.task.findMany({
      where: {
        companyId,
        inActionPlan: false,
        status: { notIn: ['COMPLETED', 'CANCELLED', 'DEFERRED', 'NOT_APPLICABLE'] },
      },
      orderBy: { priorityRank: 'asc' },
      take: slotsAvailable,
      select: { id: true, primaryAssigneeId: true },
    })

    if (queuedTasks.length > 0) {
      // Move tasks to action plan, set due date, and assign if needed
      for (const task of queuedTasks) {
        const updateData: { inActionPlan: boolean; dueDate: Date; primaryAssigneeId?: string } = {
          inActionPlan: true,
          dueDate,
        }
        if (!task.primaryAssigneeId && defaultAssigneeId) {
          updateData.primaryAssigneeId = defaultAssigneeId
        }
        await prisma.task.update({
          where: { id: task.id },
          data: updateData,
        })
      }
      newTasksAdded = queuedTasks.length
    }
  }

  const totalInPlan = tasksCarriedForward + newTasksAdded

  let message = ''
  if (carryForward && tasksCarriedForward > 0) {
    message = `Carried forward ${tasksCarriedForward} task(s)`
    if (newTasksAdded > 0) {
      message += ` and added ${newTasksAdded} new task(s)`
    }
  } else if (newTasksAdded > 0) {
    message = `Generated action plan with ${newTasksAdded} task(s)`
    if (tasksReturnedToPool > 0) {
      message += ` (${tasksReturnedToPool} returned to pool)`
    }
  } else {
    message = 'No tasks available to add to action plan'
  }

  return {
    success: true,
    tasksInPlan: totalInPlan,
    tasksCarriedForward,
    newTasksAdded,
    message,
  }
}

/**
 * Calculate and set priority for a new task based on its attributes
 */
export function calculateTaskPriorityFromAttributes(
  score: number,
  effortLevel: string,
  estimatedHours?: number | null
): {
  impactLevel: ImpactLevel
  difficultyLevel: DifficultyLevel
  priorityRank: number
} {
  const impactLevel = scoreToImpactLevel(score)
  const difficultyLevel = effortToDifficultyLevel(effortLevel, estimatedHours)
  const priorityRank = calculatePriorityRank(impactLevel, difficultyLevel)

  return { impactLevel, difficultyLevel, priorityRank }
}
