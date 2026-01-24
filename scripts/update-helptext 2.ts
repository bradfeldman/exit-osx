import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Shortened helpText (181 characters)
  const newHelpText = "Buyers expect predictable cash flow plus the ability to explain variances (seasonality, concentration, timing). Forecasting discipline and documented variance drivers reduce buyer risk."

  console.log('New helpText length:', newHelpText.length)

  const updated = await prisma.question.update({
    where: { id: 'cmkfvu6zv005osjo2m5f0bikg' },
    data: { helpText: newHelpText }
  })

  console.log('Updated question:', updated.questionText)
  console.log('New helpText:', updated.helpText)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(console.error)
