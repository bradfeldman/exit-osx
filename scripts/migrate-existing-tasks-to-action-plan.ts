/**
 * Migration Script: Set existing tasks to be in the action plan
 *
 * This script:
 * 1. Sets all existing active tasks to inActionPlan: true
 * 2. Calculates and sets priority ranks for tasks without them
 * 3. For companies with > 15 tasks, keeps top 15 in action plan, rest go to queue
 *
 * Run with: npx tsx scripts/migrate-existing-tasks-to-action-plan.ts
 */

// Load environment variables BEFORE any other imports
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function main() {
  // Dynamic imports after env is loaded
  const { prisma } = await import('../src/lib/prisma')
  const { calculatePriorityRank, scoreToImpactLevel, effortToDifficultyLevel } = await import('../src/lib/tasks/priority-matrix')
  const { initializeActionPlan } = await import('../src/lib/tasks/action-plan')

  console.log('Starting migration of existing tasks to action plan system...')

  // Get all companies with tasks
  const companies = await prisma.company.findMany({
    where: {
      tasks: {
        some: {}
      }
    },
    select: { id: true, name: true }
  })

  console.log(`Found ${companies.length} companies with tasks`)

  for (const company of companies) {
    console.log(`\nProcessing company: ${company.name}`)

    // Get all tasks for this company
    const tasks = await prisma.task.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`  Found ${tasks.length} tasks`)

    // Update each task with priority fields if missing
    for (const task of tasks) {
      // Calculate priority based on effort level
      const impactLevel = scoreToImpactLevel(0.4) // Default to medium-high impact
      const difficultyLevel = effortToDifficultyLevel(task.effortLevel, task.estimatedHours)
      const priorityRank = calculatePriorityRank(impactLevel, difficultyLevel)

      // Only update if priority fields are at default values
      if (task.priorityRank === 10) {
        await prisma.task.update({
          where: { id: task.id },
          data: {
            impactLevel,
            difficultyLevel,
            priorityRank,
          }
        })
      }
    }

    // Initialize the action plan (top 15 by priority)
    const result = await initializeActionPlan(company.id)
    console.log(`  Action plan: ${result.initialized} tasks, Queue: ${result.queued} tasks`)
  }

  console.log('\nMigration complete!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
