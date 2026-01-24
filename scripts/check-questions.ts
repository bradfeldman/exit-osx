// Quick script to check project questions in the database
import { prisma } from '../src/lib/prisma'

async function checkQuestions() {
  try {
    const projectQuestionsCount = await prisma.projectQuestion.count()
    console.log('Project Questions count:', projectQuestionsCount)

    if (projectQuestionsCount > 0) {
      const sample = await prisma.projectQuestion.findMany({
        take: 3,
        select: {
          moduleId: true,
          questionText: true,
          briCategory: true,
        }
      })
      console.log('Sample questions:', sample)
    }

    // Check initial assessment questions too
    const initialQuestionsCount = await prisma.question.count()
    console.log('Initial Assessment Questions count:', initialQuestionsCount)

    // Check a recent company's question priorities
    const recentCompany = await prisma.company.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true }
    })

    if (recentCompany) {
      const priorities = await prisma.companyQuestionPriority.count({
        where: { companyId: recentCompany.id }
      })
      const asked = await prisma.companyQuestionPriority.count({
        where: { companyId: recentCompany.id, hasBeenAsked: true }
      })
      console.log(`\nCompany: ${recentCompany.name}`)
      console.log('Total priority records:', priorities)
      console.log('Questions marked as asked:', asked)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkQuestions()
