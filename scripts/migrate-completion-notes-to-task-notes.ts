/**
 * PROD-036: Backfill existing Task.completionNotes into TaskNote records
 *
 * This script:
 * 1. Finds all completed tasks with non-empty completionNotes
 * 2. Creates TaskNote records with noteType=COMPLETION
 * 3. Preserves the original completionNotes field for backward compatibility
 *
 * Run with: npx tsx scripts/migrate-completion-notes-to-task-notes.ts
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('[MIGRATION] Starting completionNotes → TaskNote migration...\n')

  // Find all completed tasks with completion notes
  const tasksWithNotes = await prisma.task.findMany({
    where: {
      status: 'COMPLETED',
      completionNotes: { not: null },
      NOT: { completionNotes: '' },
    },
    include: {
      company: {
        select: {
          organizationId: true,
        },
      },
      primaryAssignee: {
        select: {
          id: true,
        },
      },
      notes: {
        where: {
          noteType: 'COMPLETION',
        },
      },
    },
  })

  console.log(`[MIGRATION] Found ${tasksWithNotes.length} tasks with completion notes\n`)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const task of tasksWithNotes) {
    // Skip if a COMPLETION note already exists for this task
    if (task.notes.length > 0) {
      console.log(`  [SKIP] Task ${task.id} already has a COMPLETION note`)
      skipped++
      continue
    }

    // Determine userId: use primaryAssignee if available, otherwise find first org member
    let userId = task.primaryAssignee?.id

    if (!userId) {
      const firstOrgUser = await prisma.organizationUser.findFirst({
        where: { organizationId: task.company.organizationId },
        select: { userId: true },
      })

      if (!firstOrgUser) {
        console.log(`  [ERROR] Task ${task.id}: No users found in organization`)
        failed++
        continue
      }

      userId = firstOrgUser.userId
    }

    try {
      await prisma.taskNote.create({
        data: {
          taskId: task.id,
          userId,
          content: task.completionNotes!,
          noteType: 'COMPLETION',
          // Set createdAt to match completedAt for historical accuracy
          createdAt: task.completedAt || new Date(),
        },
      })

      console.log(`  [CREATE] Task ${task.id}: Created COMPLETION note (${task.completionNotes!.length} chars)`)
      created++
    } catch (err) {
      console.error(`  [ERROR] Task ${task.id}:`, err instanceof Error ? err.message : 'Unknown error')
      failed++
    }
  }

  console.log('\n[MIGRATION] Summary:')
  console.log(`  Created: ${created}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total: ${tasksWithNotes.length}`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
