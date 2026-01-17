// Migration script for Answer Upgrade System
// Initializes effectiveOptionId for existing assessment responses

import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('=== Answer Upgrade System Migration ===\n')

  // Step 1: Initialize effectiveOptionId for all responses that don't have it
  console.log('Step 1: Initializing effectiveOptionId for existing responses...')

  const responsesWithoutEffective = await prisma.assessmentResponse.findMany({
    where: { effectiveOptionId: null },
    select: { id: true, selectedOptionId: true }
  })

  console.log(`Found ${responsesWithoutEffective.length} responses without effectiveOptionId`)

  let updatedResponses = 0
  for (const response of responsesWithoutEffective) {
    await prisma.assessmentResponse.update({
      where: { id: response.id },
      data: { effectiveOptionId: response.selectedOptionId }
    })
    updatedResponses++
  }

  console.log(`Updated ${updatedResponses} responses\n`)

  // Step 2: Show summary of companies with assessments
  console.log('Step 2: Summary of companies with completed assessments...')

  const companiesWithAssessments = await prisma.company.findMany({
    where: {
      assessments: {
        some: { completedAt: { not: null } }
      }
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          tasks: true,
          assessments: true
        }
      }
    }
  })

  console.log(`\nCompanies with completed assessments: ${companiesWithAssessments.length}`)
  for (const company of companiesWithAssessments) {
    console.log(`  - ${company.name}: ${company._count.tasks} tasks, ${company._count.assessments} assessments`)
  }

  console.log('\n=== Migration Complete ===')
  console.log('\nNotes:')
  console.log('- Existing tasks do NOT have upgrade mappings (upgradesFromOptionId, upgradesToOptionId)')
  console.log('- To regenerate tasks with upgrade mappings, users can re-run their assessment')
  console.log('- Or you can run: npx ts-node scripts/regenerate-tasks-with-upgrades.ts <companyId>')

  await prisma.$disconnect()
  await pool.end()
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
