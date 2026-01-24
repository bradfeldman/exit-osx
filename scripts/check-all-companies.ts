import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function check() {
  const { prisma } = await import('../src/lib/prisma')
  const { checkAssessmentTriggers, getAssessmentStatus } = await import('../src/lib/assessment/assessment-triggers')

  // Get all companies
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true }
  })

  for (const company of companies) {
    console.log('='.repeat(50))
    console.log('Company:', company.name)

    // Check for open project assessment
    const openAssessment = await prisma.projectAssessment.findFirst({
      where: {
        companyId: company.id,
        status: 'IN_PROGRESS'
      }
    })

    console.log('  Open (IN_PROGRESS) assessment:', openAssessment ? 'YES' : 'NO')

    // Get status
    const status = await getAssessmentStatus(company.id)
    console.log('  hasInitialAssessment:', status.hasInitialAssessment)
    console.log('  daysSinceLastAssessment:', status.daysSinceLastAssessment)
    console.log('  openTaskCount:', status.openTaskCount)

    // Check triggers
    const triggerResult = await checkAssessmentTriggers(company.id)
    console.log('  Trigger shouldCreate:', triggerResult.shouldCreate)
    console.log('  Trigger reason:', triggerResult.reason)
    console.log('')
  }

  await prisma.$disconnect()
}

check()
