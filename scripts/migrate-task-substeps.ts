/**
 * Data migration: Convert taskProgress JSON to TaskSubStep records
 *
 * This script:
 * 1. Finds all tasks with richDescription.subTasks
 * 2. Creates TaskSubStep records for each sub-task
 * 3. Migrates completion state from taskProgress JSON
 * 4. Preserves the old taskProgress as backup
 */

import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables from .env.local
config({ path: '.env.local' })

const prisma = new PrismaClient()

interface RichTaskDescription {
  subTasks?: Array<{
    category?: string
    items: string[]
  }>
}

function hasRichDescription(value: unknown): value is RichTaskDescription {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    'subTasks' in obj &&
    Array.isArray(obj.subTasks) &&
    obj.subTasks.every(
      (st: unknown) =>
        typeof st === 'object' &&
        st !== null &&
        'items' in st &&
        Array.isArray((st as { items: unknown }).items)
    )
  )
}

async function migrateSubSteps() {
  console.log('Starting sub-step migration...')

  const tasks = await prisma.task.findMany({
    where: {
      richDescription: { not: null },
    },
    select: {
      id: true,
      richDescription: true,
      taskProgress: true,
    },
  })

  console.log(`Found ${tasks.length} tasks with richDescription`)

  let tasksProcessed = 0
  let subStepsCreated = 0
  let subStepsMarkedComplete = 0

  for (const task of tasks) {
    if (!hasRichDescription(task.richDescription)) continue

    const richDesc = task.richDescription as RichTaskDescription
    if (!richDesc.subTasks || richDesc.subTasks.length === 0) continue

    // Extract completion state from taskProgress
    const progressData = task.taskProgress as { steps?: Record<string, boolean> } | null
    const completionMap = progressData?.steps ?? {}

    // Generate sub-steps
    const subStepsToCreate: Array<{
      taskId: string
      title: string
      order: number
      completed: boolean
      completedAt: Date | null
    }> = []

    let orderIndex = 0
    for (let groupIndex = 0; groupIndex < richDesc.subTasks.length; groupIndex++) {
      const group = richDesc.subTasks[groupIndex]
      for (let itemIndex = 0; itemIndex < group.items.length; itemIndex++) {
        const compositeId = `${groupIndex}-${itemIndex}`
        const isCompleted = completionMap[compositeId] ?? false

        subStepsToCreate.push({
          taskId: task.id,
          title: group.items[itemIndex],
          order: orderIndex++,
          completed: isCompleted,
          completedAt: isCompleted ? new Date() : null, // We don't have exact completion time
        })

        if (isCompleted) subStepsMarkedComplete++
      }
    }

    if (subStepsToCreate.length > 0) {
      await prisma.taskSubStep.createMany({
        data: subStepsToCreate,
      })
      subStepsCreated += subStepsToCreate.length
      tasksProcessed++
    }
  }

  console.log(`✓ Migration complete`)
  console.log(`  Tasks processed: ${tasksProcessed}`)
  console.log(`  Sub-steps created: ${subStepsCreated}`)
  console.log(`  Sub-steps marked complete: ${subStepsMarkedComplete}`)
}

migrateSubSteps()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
