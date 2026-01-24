import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })

const COMPANY_NAME = 'Wednesday One'
const CHECK_INTERVAL = 30000 // 30 seconds

async function checkAssessment(prisma: PrismaClient) {
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Wednesday', mode: 'insensitive' } },
    include: {
      assessments: {
        include: {
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
    return { found: false, assessments: [] }
  }

  return {
    found: true,
    companyId: company.id,
    assessments: company.assessments.map(a => ({
      id: a.id,
      status: a.completedAt ? 'COMPLETED' : 'IN_PROGRESS',
      responseCount: a.responses.length,
      completedAt: a.completedAt,
      responses: a.responses.map(r => ({
        questionId: r.questionId,
        category: r.question.briCategory,
        questionText: r.question.questionText.substring(0, 50),
        selectedOption: r.selectedOption?.optionText?.substring(0, 40),
        score: r.selectedOption?.scoreValue
      }))
    }))
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('='.repeat(60))
  console.log('ASSESSMENT MONITOR STARTED')
  console.log('Monitoring:', COMPANY_NAME)
  console.log('Check interval:', CHECK_INTERVAL / 1000, 'seconds')
  console.log('Started at:', new Date().toISOString())
  console.log('='.repeat(60))

  let lastState: string = ''
  let checkCount = 0

  const check = async () => {
    checkCount++
    const timestamp = new Date().toISOString()
    const result = await checkAssessment(prisma)

    // Create a state string to detect changes
    const currentState = JSON.stringify({
      assessmentCount: result.assessments.length,
      responses: result.assessments.map(a => ({
        id: a.id,
        count: a.responseCount,
        status: a.status
      }))
    })

    const changed = currentState !== lastState

    if (changed || checkCount === 1) {
      console.log('\n' + '-'.repeat(60))
      console.log('[' + timestamp + '] CHECK #' + checkCount + (changed && checkCount > 1 ? ' *** CHANGE DETECTED ***' : ''))
      console.log('-'.repeat(60))

      if (!result.found) {
        console.log('Company not found!')
      } else {
        console.log('Assessments:', result.assessments.length)

        for (const assessment of result.assessments) {
          console.log('\n  Assessment:', assessment.id.substring(0, 20) + '...')
          console.log('  Status:', assessment.status || 'IN_PROGRESS')
          console.log('  Responses:', assessment.responseCount, '/ 22')
          console.log('  Completed:', assessment.completedAt || 'No')

          if (assessment.responseCount > 0) {
            console.log('\n  Response Details:')
            const byCategory: Record<string, number> = {}
            for (const resp of assessment.responses) {
              byCategory[resp.category] = (byCategory[resp.category] || 0) + 1
            }
            for (const [cat, count] of Object.entries(byCategory).sort()) {
              console.log('    ' + cat + ':', count)
            }
          }
        }
      }

      if (changed && checkCount > 1) {
        console.log('\n  !!! STATE CHANGED FROM PREVIOUS CHECK !!!')
        console.log('  Previous:', lastState)
        console.log('  Current:', currentState)
      }

      lastState = currentState
    } else {
      // Just print a dot to show we're still running
      process.stdout.write('.')
    }
  }

  // Initial check
  await check()

  // Set up interval
  const intervalId = setInterval(check, CHECK_INTERVAL)

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nMonitor stopped at:', new Date().toISOString())
    console.log('Total checks:', checkCount)
    clearInterval(intervalId)
    await prisma.$disconnect()
    await pool.end()
    process.exit(0)
  })

  console.log('\nMonitoring... (Press Ctrl+C to stop)')
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
