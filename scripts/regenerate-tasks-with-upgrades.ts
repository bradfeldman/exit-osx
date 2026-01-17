// Regenerate tasks with Answer Upgrade mappings for a specific company
// Usage: npx ts-node scripts/regenerate-tasks-with-upgrades.ts [companyId|companyName]

import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
// Inline the template matching function to avoid module resolution issues
// This duplicates some logic but allows the script to run standalone

type TaskTemplate = {
  questionPattern: string
  briCategory: string
  scoreThreshold: number
  tasks: Array<{
    title: string
    description: string
    actionType: string
    effortLevel: string
    complexity: string
    estimatedHours?: number
    impactMultiplier: number
    upgradeFromScore: number
    upgradeToScore: number
  }>
}

// Import templates from the main file - we'll inline them for script compatibility
const taskTemplates: TaskTemplate[] = [
  // FINANCIAL
  {
    questionPattern: 'revenue been over the past 3 years',
    briCategory: 'FINANCIAL',
    scoreThreshold: 0.67,
    tasks: [
      { title: 'Implement revenue forecasting system', description: 'Create a rolling 12-month revenue forecast with variance tracking.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.5, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
      { title: 'Diversify revenue streams', description: 'Identify and develop 2-3 new revenue streams.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'HIGH', complexity: 'STRATEGIC', estimatedHours: 80, impactMultiplier: 0.8, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
    ],
  },
  { questionPattern: 'recurring sources', briCategory: 'FINANCIAL', scoreThreshold: 0.67, tasks: [
    { title: 'Convert project clients to retainer agreements', description: 'Create retainer or subscription proposals.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 30, impactMultiplier: 0.6, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Launch subscription or maintenance program', description: 'Create a recurring revenue program.', actionType: 'TYPE_IV_INSTITUTIONALIZE', effortLevel: 'HIGH', complexity: 'STRATEGIC', estimatedHours: 60, impactMultiplier: 0.9, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'customer base', briCategory: 'FINANCIAL', scoreThreshold: 0.67, tasks: [
    { title: 'Develop customer acquisition strategy', description: 'Create a plan to reduce dependency on top accounts.', actionType: 'TYPE_V_RISK_REDUCTION', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 25, impactMultiplier: 0.5, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Document customer concentration risk mitigation', description: 'Create a risk assessment plan.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'LOW', complexity: 'SIMPLE', estimatedHours: 8, impactMultiplier: 0.3, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'financial records', briCategory: 'FINANCIAL', scoreThreshold: 0.67, tasks: [
    { title: 'Implement monthly close process', description: 'Establish formal monthly financial close.', actionType: 'TYPE_IV_INSTITUTIONALIZE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 40, impactMultiplier: 0.6, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Engage CPA for financial review', description: 'Hire a CPA firm to review financials.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'MODERATE', complexity: 'SIMPLE', estimatedHours: 20, impactMultiplier: 0.8, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'gross profit margin', briCategory: 'FINANCIAL', scoreThreshold: 0.67, tasks: [
    { title: 'Conduct pricing analysis', description: 'Review pricing to increase margins.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.5, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Reduce cost of goods sold', description: 'Implement cost reduction strategies.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'HIGH', complexity: 'COMPLEX', estimatedHours: 60, impactMultiplier: 0.7, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'cash flow', briCategory: 'FINANCIAL', scoreThreshold: 0.67, tasks: [
    { title: 'Implement 13-week cash flow forecast', description: 'Create rolling 13-week cash flow forecast.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'LOW', complexity: 'MODERATE', estimatedHours: 12, impactMultiplier: 0.4, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Establish cash reserve policy', description: 'Create and fund cash reserve equal to 3-6 months operating expenses.', actionType: 'TYPE_V_RISK_REDUCTION', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.5, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
    { title: 'Optimize working capital cycle', description: 'Reduce DSO and optimize inventory/payables.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'HIGH', complexity: 'STRATEGIC', estimatedHours: 60, impactMultiplier: 0.7, upgradeFromScore: 0.67, upgradeToScore: 1.00 },
  ]},
  // TRANSFERABILITY
  { questionPattern: 'dependent is the business on you', briCategory: 'TRANSFERABILITY', scoreThreshold: 0.67, tasks: [
    { title: 'Document your daily responsibilities', description: 'Create a detailed list of tasks to delegate.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'LOW', complexity: 'SIMPLE', estimatedHours: 8, impactMultiplier: 0.3, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Delegate key responsibilities', description: 'Transfer 3-5 key functions to team members.', actionType: 'TYPE_IV_INSTITUTIONALIZE', effortLevel: 'HIGH', complexity: 'COMPLEX', estimatedHours: 80, impactMultiplier: 0.8, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
    { title: 'Take a 2-week vacation test', description: 'Test business continuity without your involvement.', actionType: 'TYPE_VII_READINESS', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.5, upgradeFromScore: 0.67, upgradeToScore: 1.00 },
  ]},
  { questionPattern: 'management team', briCategory: 'TRANSFERABILITY', scoreThreshold: 0.67, tasks: [
    { title: 'Define organizational structure', description: 'Create clear org chart with roles.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'LOW', complexity: 'SIMPLE', estimatedHours: 6, impactMultiplier: 0.3, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Hire or promote key managers', description: 'Fill gaps in management.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'MAJOR', complexity: 'STRATEGIC', estimatedHours: 120, impactMultiplier: 0.9, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
    { title: 'Implement management incentive plan', description: 'Create retention incentives.', actionType: 'TYPE_VI_ALIGNMENT', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.5, upgradeFromScore: 0.67, upgradeToScore: 1.00 },
  ]},
  { questionPattern: 'documented are your business processes', briCategory: 'TRANSFERABILITY', scoreThreshold: 0.67, tasks: [
    { title: 'Create SOP documentation project', description: 'Document top 10 critical processes.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 40, impactMultiplier: 0.7, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Implement knowledge management system', description: 'Set up wiki or documentation platform.', actionType: 'TYPE_IV_INSTITUTIONALIZE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 30, impactMultiplier: 0.5, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'customer relationships dependent on you', briCategory: 'TRANSFERABILITY', scoreThreshold: 0.67, tasks: [
    { title: 'Introduce team members to key accounts', description: 'Schedule meetings with top 10 customers.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.6, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Implement CRM system', description: 'Deploy CRM to capture customer details.', actionType: 'TYPE_IV_INSTITUTIONALIZE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 40, impactMultiplier: 0.5, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  // OPERATIONAL
  { questionPattern: 'scalable', briCategory: 'OPERATIONAL', scoreThreshold: 0.67, tasks: [
    { title: 'Automate manual processes', description: 'Automate 3-5 time-intensive processes.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'HIGH', complexity: 'COMPLEX', estimatedHours: 60, impactMultiplier: 0.6, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Create scalability roadmap', description: 'Document investments needed to 2x revenue.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'LOW', complexity: 'MODERATE', estimatedHours: 12, impactMultiplier: 0.4, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'technology infrastructure', briCategory: 'OPERATIONAL', scoreThreshold: 0.67, tasks: [
    { title: 'Conduct technology audit', description: 'Review systems and identify issues.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.4, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Create technology modernization plan', description: 'Develop roadmap for updating systems.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'MODERATE', complexity: 'COMPLEX', estimatedHours: 30, impactMultiplier: 0.6, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'employee retention', briCategory: 'OPERATIONAL', scoreThreshold: 0.67, tasks: [
    { title: 'Conduct employee satisfaction survey', description: 'Survey employees to understand engagement.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'LOW', complexity: 'SIMPLE', estimatedHours: 8, impactMultiplier: 0.3, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Implement retention program', description: 'Create competitive compensation and benefits.', actionType: 'TYPE_IV_INSTITUTIONALIZE', effortLevel: 'HIGH', complexity: 'COMPLEX', estimatedHours: 60, impactMultiplier: 0.7, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'vendor.*supplier', briCategory: 'OPERATIONAL', scoreThreshold: 0.67, tasks: [
    { title: 'Formalize vendor agreements', description: 'Convert informal vendor relationships to contracts.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 25, impactMultiplier: 0.6, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Create vendor backup plan', description: 'Identify alternative suppliers.', actionType: 'TYPE_V_RISK_REDUCTION', effortLevel: 'LOW', complexity: 'SIMPLE', estimatedHours: 10, impactMultiplier: 0.4, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  // MARKET
  { questionPattern: 'growth.*market', briCategory: 'MARKET', scoreThreshold: 0.67, tasks: [
    { title: 'Document market opportunity', description: 'Create market analysis showing TAM/SAM/SOM.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.5, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Identify adjacent market opportunities', description: 'Research expansion opportunities.', actionType: 'TYPE_IX_OPTIONS', effortLevel: 'MODERATE', complexity: 'STRATEGIC', estimatedHours: 30, impactMultiplier: 0.6, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'competitive position', briCategory: 'MARKET', scoreThreshold: 0.67, tasks: [
    { title: 'Create competitive analysis', description: 'Document competitors and differentiation.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 15, impactMultiplier: 0.4, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Strengthen market positioning', description: 'Develop strategies to differentiate.', actionType: 'TYPE_III_OPERATIONAL', effortLevel: 'HIGH', complexity: 'STRATEGIC', estimatedHours: 60, impactMultiplier: 0.7, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'proprietary.*IP', briCategory: 'MARKET', scoreThreshold: 0.67, tasks: [
    { title: 'Conduct IP audit', description: 'Inventory all intellectual property.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.4, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Protect key intellectual property', description: 'File trademarks, patents.', actionType: 'TYPE_V_RISK_REDUCTION', effortLevel: 'HIGH', complexity: 'COMPLEX', estimatedHours: 50, impactMultiplier: 0.7, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  // LEGAL_TAX
  { questionPattern: 'corporate structure', briCategory: 'LEGAL_TAX', scoreThreshold: 0.67, tasks: [
    { title: 'Review and clean up corporate structure', description: 'Simplify entity structure.', actionType: 'TYPE_V_RISK_REDUCTION', effortLevel: 'MODERATE', complexity: 'COMPLEX', estimatedHours: 30, impactMultiplier: 0.7, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Organize corporate documents', description: 'Create data room with records.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.5, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'contracts.*licenses.*permits', briCategory: 'LEGAL_TAX', scoreThreshold: 0.67, tasks: [
    { title: 'Audit contracts and agreements', description: 'Review all contracts for assignability.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 25, impactMultiplier: 0.5, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Renew expiring licenses and permits', description: 'Identify and renew expiring items.', actionType: 'TYPE_V_RISK_REDUCTION', effortLevel: 'LOW', complexity: 'SIMPLE', estimatedHours: 10, impactMultiplier: 0.5, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'litigation.*disputes.*regulatory', briCategory: 'LEGAL_TAX', scoreThreshold: 0.67, tasks: [
    { title: 'Resolve pending legal matters', description: 'Settle outstanding disputes.', actionType: 'TYPE_V_RISK_REDUCTION', effortLevel: 'HIGH', complexity: 'COMPLEX', estimatedHours: 60, impactMultiplier: 0.8, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Document litigation history', description: 'Prepare summary of past litigation.', actionType: 'TYPE_II_DOCUMENTATION', effortLevel: 'LOW', complexity: 'SIMPLE', estimatedHours: 8, impactMultiplier: 0.3, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  // PERSONAL
  { questionPattern: 'exit timeline', briCategory: 'PERSONAL', scoreThreshold: 0.67, tasks: [
    { title: 'Define exit timeline and goals', description: 'Document target exit date and deal structure.', actionType: 'TYPE_VI_ALIGNMENT', effortLevel: 'LOW', complexity: 'SIMPLE', estimatedHours: 4, impactMultiplier: 0.5, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Create personal financial plan', description: 'Understand post-exit financial needs.', actionType: 'TYPE_VII_READINESS', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 15, impactMultiplier: 0.6, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'personal and business assets', briCategory: 'PERSONAL', scoreThreshold: 0.67, tasks: [
    { title: 'Separate personal expenses', description: 'Remove personal expenses from business.', actionType: 'TYPE_I_EVIDENCE', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.6, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Transfer personal assets', description: 'Move personal assets out of business.', actionType: 'TYPE_V_RISK_REDUCTION', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 15, impactMultiplier: 0.5, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
  { questionPattern: 'key employees aware', briCategory: 'PERSONAL', scoreThreshold: 0.67, tasks: [
    { title: 'Develop key employee communication plan', description: 'Create timeline for informing employees.', actionType: 'TYPE_VI_ALIGNMENT', effortLevel: 'LOW', complexity: 'MODERATE', estimatedHours: 8, impactMultiplier: 0.4, upgradeFromScore: 0.00, upgradeToScore: 0.33 },
    { title: 'Create employee retention agreements', description: 'Develop stay bonuses.', actionType: 'TYPE_VI_ALIGNMENT', effortLevel: 'MODERATE', complexity: 'MODERATE', estimatedHours: 20, impactMultiplier: 0.7, upgradeFromScore: 0.33, upgradeToScore: 0.67 },
  ]},
]

function getTemplatesForQuestion(questionText: string): TaskTemplate[] {
  return taskTemplates.filter(template =>
    new RegExp(template.questionPattern, 'i').test(questionText)
  )
}

config({ path: '.env.local' })

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const companyArg = process.argv[2]

  // Find company
  let company
  if (companyArg) {
    company = await prisma.company.findFirst({
      where: {
        OR: [
          { id: companyArg },
          { name: { contains: companyArg, mode: 'insensitive' } }
        ]
      }
    })
  } else {
    // Default to first company with a completed assessment
    company = await prisma.company.findFirst({
      where: {
        assessments: { some: { completedAt: { not: null } } }
      }
    })
  }

  if (!company) {
    console.log('Company not found')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  console.log(`\n=== Regenerating Tasks for ${company.name} ===\n`)

  // Get latest completed assessment
  const assessment = await prisma.assessment.findFirst({
    where: {
      companyId: company.id,
      completedAt: { not: null }
    },
    orderBy: { completedAt: 'desc' },
    include: {
      responses: {
        include: {
          question: true,
          selectedOption: true
        }
      }
    }
  })

  if (!assessment) {
    console.log('No completed assessment found')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  // Get latest snapshot for value gap
  const snapshot = await prisma.valuationSnapshot.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: 'desc' }
  })

  if (!snapshot) {
    console.log('No valuation snapshot found')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  const valueGap = Number(snapshot.valueGap)
  console.log(`Value Gap: $${valueGap.toLocaleString()}`)
  console.log(`Responses: ${assessment.responses.length}`)

  // Delete existing pending tasks
  const deleted = await prisma.task.deleteMany({
    where: {
      companyId: company.id,
      status: 'PENDING'
    }
  })
  console.log(`Deleted ${deleted.count} existing pending tasks\n`)

  // Category weights for value estimation
  const categoryWeights: Record<string, number> = {
    FINANCIAL: 0.25,
    TRANSFERABILITY: 0.20,
    OPERATIONAL: 0.20,
    MARKET: 0.15,
    LEGAL_TAX: 0.10,
    PERSONAL: 0.10,
  }

  const effortMultipliers: Record<string, number> = {
    MINIMAL: 0.5,
    LOW: 1,
    MODERATE: 2,
    HIGH: 4,
    MAJOR: 8,
  }

  let created = 0
  let skipped = 0
  const scoreTolerance = 0.05

  for (const response of assessment.responses) {
    const currentScore = Number(response.selectedOption.scoreValue)
    const questionId = response.questionId

    // Get all options for this question
    const options = await prisma.questionOption.findMany({
      where: { questionId },
      orderBy: { scoreValue: 'asc' }
    })

    // Get matching templates
    const templates = getTemplatesForQuestion(response.question.questionText)

    for (const template of templates) {
      if (currentScore >= template.scoreThreshold) {
        skipped++
        continue
      }

      // Count questions in this category
      const questionsInCategory = assessment.responses.filter(
        r => r.question.briCategory === template.briCategory
      ).length

      for (const taskDef of template.tasks) {
        // Check if user's score matches this task's upgradeFromScore
        if (Math.abs(currentScore - taskDef.upgradeFromScore) > scoreTolerance) {
          continue
        }

        // Find upgrade options
        const fromOption = options.find(
          o => Math.abs(Number(o.scoreValue) - taskDef.upgradeFromScore) <= scoreTolerance
        )
        const toOption = options.find(
          o => Math.abs(Number(o.scoreValue) - taskDef.upgradeToScore) <= scoreTolerance
        )

        if (!fromOption || !toOption) {
          console.log(`  Skip: ${taskDef.title} - options not found`)
          skipped++
          continue
        }

        // Calculate estimated value
        const scoreImprovement = taskDef.upgradeToScore - taskDef.upgradeFromScore
        const categoryWeight = categoryWeights[template.briCategory] || 0.1
        const questionWeight = questionsInCategory > 0 ? 1 / questionsInCategory : 0.25
        const estimatedValue = scoreImprovement * categoryWeight * questionWeight * valueGap

        const effortMult = effortMultipliers[taskDef.effortLevel] || 2
        const normalizedValue = estimatedValue / effortMult

        await prisma.task.create({
          data: {
            companyId: company.id,
            title: taskDef.title,
            description: taskDef.description,
            actionType: taskDef.actionType as never,
            briCategory: template.briCategory as never,
            linkedQuestionId: questionId,
            upgradesFromOptionId: fromOption.id,
            upgradesToOptionId: toOption.id,
            rawImpact: estimatedValue,
            normalizedValue,
            effortLevel: taskDef.effortLevel as never,
            complexity: taskDef.complexity as never,
            estimatedHours: taskDef.estimatedHours,
            status: 'PENDING'
          }
        })
        created++
        console.log(`  Created: ${taskDef.title}`)
        console.log(`    Upgrade: ${taskDef.upgradeFromScore} -> ${taskDef.upgradeToScore}`)
        console.log(`    Est. Value: $${Math.round(estimatedValue).toLocaleString()}`)
      }
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Tasks created: ${created}`)
  console.log(`Tasks skipped: ${skipped}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
