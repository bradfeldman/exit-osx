import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
  const { prisma } = await import('../src/lib/prisma')

  // Find Wednesday Consulting
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Wednesday' } },
    select: { id: true, name: true }
  })

  if (!company) {
    console.log('Company not found')
    return
  }

  console.log('Company:', company.name, '(', company.id, ')')
  console.log('')

  // Check project assessments
  const projectAssessments = await prisma.projectAssessment.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      assessmentNumber: true,
      status: true,
      title: true,
      createdAt: true,
      completedAt: true,
    }
  })

  console.log('Project Assessments:', projectAssessments.length)
  projectAssessments.forEach(a => {
    console.log(`  #${a.assessmentNumber}: ${a.status} - ${a.title}`)
    console.log(`    Created: ${a.createdAt}`)
    console.log(`    Completed: ${a.completedAt || 'N/A'}`)
  })

  // Check for IN_PROGRESS specifically
  const inProgress = projectAssessments.filter(a => a.status === 'IN_PROGRESS')
  console.log('')
  console.log('IN_PROGRESS assessments:', inProgress.length)
  inProgress.forEach(a => {
    console.log(`  ID: ${a.id}`)
  })

  // Check task counts
  const openTasks = await prisma.task.count({
    where: {
      companyId: company.id,
      status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] }
    }
  })
  console.log('')
  console.log('Open tasks:', openTasks)

  await prisma.$disconnect()
}

check()
