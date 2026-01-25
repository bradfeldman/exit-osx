import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { briQuestions } from './seed-data/bri-questions'
import { industryMultiples } from './seed-data/industry-multiples'
import { roleTemplates } from './seed-data/role-templates'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('Starting database seed...')

  // Check if questions already exist (don't delete if assessment responses exist)
  const existingQuestions = await prisma.question.count()
  const existingResponses = await prisma.assessmentResponse.count()

  if (existingResponses > 0) {
    console.log(`Skipping BRI questions - ${existingResponses} assessment responses exist`)
    console.log(`Database has ${existingQuestions} existing questions`)
  } else {
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
  }

  // Clear and seed industry multiples (always safe to recreate)
  console.log('Clearing existing industry multiples...')
  await prisma.industryMultiple.deleteMany()

  console.log('Seeding industry multiples...')
  for (const multiple of industryMultiples) {
    await prisma.industryMultiple.create({
      data: {
        icbIndustry: multiple.icbIndustry,
        icbSuperSector: multiple.icbSuperSector,
        icbSector: multiple.icbSector,
        icbSubSector: multiple.icbSubSector,
        revenueMultipleLow: multiple.revenueMultipleLow,
        revenueMultipleHigh: multiple.revenueMultipleHigh,
        ebitdaMultipleLow: multiple.ebitdaMultipleLow,
        ebitdaMultipleHigh: multiple.ebitdaMultipleHigh,
        effectiveDate: multiple.effectiveDate,
        source: multiple.source,
      },
    })
  }
  console.log(`Seeded ${industryMultiples.length} industry multiples`)

  // Seed role templates (upsert to preserve existing data)
  console.log('Seeding role templates...')
  for (const template of roleTemplates) {
    await prisma.roleTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        icon: template.icon,
        defaultPermissions: template.defaultPermissions,
        isBuiltIn: template.isBuiltIn,
      },
      create: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        icon: template.icon,
        defaultPermissions: template.defaultPermissions,
        isBuiltIn: template.isBuiltIn,
      },
    })
  }
  console.log(`Seeded ${roleTemplates.length} role templates`)

  // Verify
  const questionCount = await prisma.question.count()
  const optionCount = await prisma.questionOption.count()
  const multiplesCount = await prisma.industryMultiple.count()
  const templateCount = await prisma.roleTemplate.count()

  console.log(`Database now has ${questionCount} questions, ${optionCount} options, ${multiplesCount} industry multiples, and ${templateCount} role templates`)

  await prisma.$disconnect()
  await pool.end()

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
