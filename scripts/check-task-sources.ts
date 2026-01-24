import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { taskTemplates } from '../src/lib/playbook/task-templates'

async function check() {
  const { prisma } = await import('../src/lib/prisma')

  // Count task templates
  let totalTemplateTasks = 0
  for (const t of taskTemplates) {
    totalTemplateTasks += t.tasks.length
  }
  console.log('Task Templates:', taskTemplates.length, 'patterns with', totalTemplateTasks, 'total tasks')

  // Count project questions (10-minute assessments)
  const projectQuestions = await prisma.projectQuestion.count()
  console.log('Project Questions:', projectQuestions)

  // Check current tasks and their sources
  const tasks = await prisma.task.findMany({
    select: { title: true, linkedQuestionId: true }
  })

  const fromTemplates = tasks.filter(t => !t.title.startsWith('Improve:')).length
  const fromProjectAssessments = tasks.filter(t => t.title.startsWith('Improve:')).length

  console.log('')
  console.log('Current Tasks:')
  console.log('  - From templates:', fromTemplates)
  console.log('  - From project assessments (Improve:...):', fromProjectAssessments)
  console.log('  - Total:', tasks.length)

  await prisma.$disconnect()
}

check()
