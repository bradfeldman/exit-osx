import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
  const { prisma } = await import('../src/lib/prisma')
  const { checkAssessmentTriggers, getAssessmentStatus } = await import('../src/lib/assessment/assessment-triggers')

  // Find Wednesday Consulting
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Wednesday' } },
    select: { id: true, name: true }
  })

  if (!company) {
    console.log('Company not found')
    return
  }

  console.log('Company:', company.name)
  console.log('')

  // Get assessment status
  const status = await getAssessmentStatus(company.id)
  console.log('Assessment Status:')
  console.log('  hasInitialAssessment:', status.hasInitialAssessment)
  console.log('  hasOpenAssessment:', status.hasOpenAssessment)
  console.log('  lastAssessmentDate:', status.lastAssessmentDate)
  console.log('  daysSinceLastAssessment:', status.daysSinceLastAssessment)
  console.log('  openTaskCount:', status.openTaskCount)
  console.log('  totalTaskCount:', status.totalTaskCount)
  console.log('  hasAvailableQuestions:', status.hasAvailableQuestions)
  console.log('')

  // Check triggers
  const triggerResult = await checkAssessmentTriggers(company.id)
  console.log('Trigger Result:')
  console.log('  shouldCreate:', triggerResult.shouldCreate)
  console.log('  reason:', triggerResult.reason)
  console.log('  message:', triggerResult.message)
  console.log('  canCreate:', triggerResult.canCreate)
  console.log('  blockedReason:', triggerResult.blockedReason)

  await prisma.$disconnect()
}

check()
