import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { briQuestions } from './seed-data/bri-questions'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('Starting database seed...')

  // Clear existing questions (cascade will remove options)
  console.log('Clearing existing questions...')
  await prisma.question.deleteMany()

  // Seed BRI questions
  console.log('Seeding BRI questions...')

  for (const question of briQuestions) {
    await prisma.question.create({
      data: {
        briCategory: question.briCategory,
        questionText: question.questionText,
        helpText: question.helpText,
        displayOrder: question.displayOrder,
        maxImpactPoints: question.maxImpactPoints,
        isActive: true,
        options: {
          create: question.options.map(opt => ({
            optionText: opt.optionText,
            scoreValue: opt.scoreValue,
            displayOrder: opt.displayOrder,
          })),
        },
      },
    })
  }

  console.log(`Seeded ${briQuestions.length} BRI questions`)

  // Verify
  const questionCount = await prisma.question.count()
  const optionCount = await prisma.questionOption.count()

  console.log(`Database now has ${questionCount} questions and ${optionCount} options`)

  await prisma.$disconnect()
  await pool.end()

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
