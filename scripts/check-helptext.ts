import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const questions = await prisma.question.findMany({
    where: { isActive: true },
    select: { id: true, questionText: true, helpText: true },
    orderBy: { displayOrder: 'asc' }
  })

  console.log('Questions with helpText > 200 characters:\n')
  let count = 0
  for (const q of questions) {
    const len = q.helpText?.length || 0
    if (len > 200) {
      count++
      console.log('---')
      console.log('ID:', q.id)
      console.log('Q:', q.questionText.substring(0, 60) + '...')
      console.log('Length:', len)
      console.log('Text:', q.helpText)
      console.log('')
    }
  }

  console.log(`\nTotal: ${count} questions exceed 200 characters`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(console.error)
