import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Find company named "Wednesday One"
  const company = await prisma.company.findFirst({
    where: {
      name: {
        contains: 'Wednesday',
        mode: 'insensitive'
      }
    },
    include: {
      assessments: {
        select: {
          id: true,
          createdAt: true,
          completedAt: true,
          responses: {
            include: {
              question: true,
              selectedOption: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!company) {
    console.log('No company found matching "Wednesday"')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  console.log('\n=== Company Found ===')
  console.log('Name:', company.name)
  console.log('ID:', company.id)
  console.log('Created:', company.createdAt)

  if (company.assessments.length === 0) {
    console.log('\nNo assessments found for this company.')
  } else {
    console.log('\n=== Assessments ===')
    console.log('Total assessments:', company.assessments.length)

    for (const assessment of company.assessments) {
      console.log('\n--- Assessment ---')
      console.log('ID:', assessment.id)
      console.log('Created:', assessment.createdAt)
      console.log('Completed:', assessment.completedAt || 'Not completed')
      console.log('Responses:', assessment.responses.length, 'of 22 questions')

      if (assessment.responses.length > 0) {
        console.log('\nResponses by Category:')
        const byCategory: Record<string, number> = {}
        for (const resp of assessment.responses) {
          const cat = resp.question.briCategory
          byCategory[cat] = (byCategory[cat] || 0) + 1
        }
        for (const [cat, count] of Object.entries(byCategory).sort()) {
          console.log('  ' + cat + ':', count)
        }
      }
    }
  }

  await prisma.$disconnect()
  await pool.end()
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
