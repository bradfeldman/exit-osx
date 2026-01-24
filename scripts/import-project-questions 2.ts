/**
 * Import Project Questions from Task Engine JSON Modules
 *
 * This script reads all 596 JSON module files and imports them into the database:
 * - ProjectQuestion (with briCategory, questionText, helpText, etc.)
 * - ProjectQuestionOption (with scoreValue mappings)
 * - ProjectStrategy (FULL_FIX, PARTIAL_MITIGATION, RISK_ACCEPTANCE)
 * - ProjectTaskTemplate (tasks within each strategy)
 *
 * Run with: npx tsx scripts/import-project-questions.ts
 */

import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
config({ path: '.env.local' })

// Types matching the JSON module structure
interface ModuleOption {
  optionId: string
  optionText: string
  score: number
  buyerInterpretation: string
}

interface ModuleQuestion {
  id: string
  questionText: string
  briCategory: string
  subCategory: string
  questionImpact: string
  definitionNote: string
  helpText: string
  options: ModuleOption[]
  relatedQuestions: string[]
}

interface ModuleTask {
  id?: string        // Some modules use 'id'
  taskId?: string    // Some modules use 'taskId'
  sequence: number
  title: string
  primaryVerb: string
  verbTier?: number
  object: string
  outcome: string
  ownerRole: string
  timebox: string
  effortLevel?: string
  complexity?: string
  estimatedHours?: number
  deliverables: string[]
  evidence: string[]
  riskCategory: string
  dependencies: string[]
  blockedBy: string[]
  upgradesScoreFrom?: number
  upgradesScoreTo?: number
  deferReasonCode?: string
  companionVerbs?: string[]
  reEvaluationDate?: string
  valueImpactState?: string
  mitigationSummary?: string
}

interface ModuleStrategy {
  strategyId: string
  strategyName: string
  strategyDescription: string
  strategyType: string
  upgradeFromScore: number
  maxScoreAchievable: number
  estimatedEffort: string
  estimatedTimeline: string
  applicableWhen: string
  tasks: ModuleTask[]
}

interface ModuleMetadata {
  riskDefinition: string
  buyerSensitivity: string
  typicalBuyerResponses: string[]
  primaryValueLever: string
  relatedModules: string[]
}

interface TaskModule {
  moduleVersion: string
  generatedDate: string
  moduleId: string
  question: ModuleQuestion
  moduleMetadata: ModuleMetadata
  strategies: ModuleStrategy[]
  suppressionRules: unknown[]
  validationRules: unknown
}

// Map JSON category names to Prisma BriCategory enum
const categoryMap: Record<string, string> = {
  'FINANCIAL': 'FINANCIAL',
  'TRANSFERABILITY': 'TRANSFERABILITY',
  'OPERATIONAL': 'OPERATIONAL',
  'MARKET': 'MARKET',
  'LEGAL_TAX': 'LEGAL_TAX',
  'PERSONAL': 'PERSONAL',
  'PERSONAL_READINESS': 'PERSONAL',
}

// Map impact to enum
const impactMap: Record<string, string> = {
  'CRITICAL': 'CRITICAL',
  'HIGH': 'HIGH',
  'MEDIUM': 'MEDIUM',
  'LOW': 'LOW',
}

// Map buyer sensitivity
const sensitivityMap: Record<string, string> = {
  'CRITICAL': 'CRITICAL',
  'HIGH': 'HIGH',
  'MEDIUM': 'MEDIUM',
  'LOW': 'LOW',
}

// Map strategy types
const strategyTypeMap: Record<string, string> = {
  'FULL_FIX': 'FULL_FIX',
  'PARTIAL_MITIGATION': 'PARTIAL_MITIGATION',
  'RISK_ACCEPTANCE': 'RISK_ACCEPTANCE',
}

// Map owner roles
const ownerRoleMap: Record<string, string> = {
  'FOUNDER': 'FOUNDER',
  'CFO_FINANCE': 'CFO_FINANCE',
  'OPS_LEADER': 'OPS_LEADER',
  'SALES_MKTG': 'SALES_MKTG',
  'HR_PEOPLE': 'HR_PEOPLE',
  'LEGAL_COMPLIANCE': 'LEGAL_COMPLIANCE',
  'IT_SECURITY': 'IT_SECURITY',
  'ADVISOR': 'ADVISOR',
}

// Map timebox
const timeboxMap: Record<string, string> = {
  'IMMEDIATE_0_30': 'IMMEDIATE_0_30',
  'NEAR_30_90': 'NEAR_30_90',
  'LONG_90_365': 'LONG_90_365',
}

// Map effort levels
const effortMap: Record<string, string> = {
  'MINIMAL': 'MINIMAL',
  'LOW': 'LOW',
  'MODERATE': 'MODERATE',
  'HIGH': 'HIGH',
  'MAJOR': 'MAJOR',
}

// Map complexity
const complexityMap: Record<string, string> = {
  'SIMPLE': 'SIMPLE',
  'MODERATE': 'MODERATE',
  'COMPLEX': 'COMPLEX',
  'STRATEGIC': 'STRATEGIC',
}

async function findJsonModules(baseDir: string): Promise<string[]> {
  const files: string[] = []

  function walkDir(dir: string) {
    if (!fs.existsSync(dir)) return

    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (entry.name.endsWith('.json') && entry.name.match(/^\d+_/)) {
        files.push(fullPath)
      }
    }
  }

  walkDir(baseDir)
  return files.sort()
}

async function main() {
  console.log('='.repeat(60))
  console.log('Project Questions Import')
  console.log('='.repeat(60))

  // Initialize Prisma
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Path to Task Engine modules
  const taskEngineDir = path.resolve(__dirname, '../../Task Engine/Tasks')

  console.log(`\nSearching for modules in: ${taskEngineDir}`)

  const moduleFiles = await findJsonModules(taskEngineDir)
  console.log(`Found ${moduleFiles.length} module files`)

  if (moduleFiles.length === 0) {
    console.log('No module files found. Exiting.')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  // Track stats
  const stats = {
    questionsCreated: 0,
    questionsUpdated: 0,
    optionsCreated: 0,
    strategiesCreated: 0,
    tasksCreated: 0,
    errors: 0,
  }

  // Process each module
  for (const filePath of moduleFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const module: TaskModule = JSON.parse(content)

      const q = module.question
      const meta = module.moduleMetadata

      // Map category
      let briCategory = categoryMap[q.briCategory]
      if (!briCategory) {
        console.log(`  ⚠️  Unknown category "${q.briCategory}" in ${path.basename(filePath)}, defaulting to OPERATIONAL`)
        briCategory = 'OPERATIONAL'
      }

      // Map impact and sensitivity
      const questionImpact = impactMap[q.questionImpact] || 'MEDIUM'
      const buyerSensitivity = sensitivityMap[meta.buyerSensitivity] || 'MEDIUM'

      // Check if question already exists by moduleId OR by questionId
      // (Both fields have unique constraints)
      let existingQuestion = await prisma.projectQuestion.findUnique({
        where: { moduleId: module.moduleId }
      })

      // Also check by questionId if not found by moduleId
      if (!existingQuestion) {
        existingQuestion = await prisma.projectQuestion.findUnique({
          where: { questionId: q.id }
        })
      }

      let projectQuestionId: string

      if (existingQuestion) {
        // Update existing question
        await prisma.projectQuestion.update({
          where: { id: existingQuestion.id },
          data: {
            // Update moduleId if different (for cases where questionId matched but moduleId didn't)
            moduleId: module.moduleId,
            questionText: q.questionText,
            briCategory: briCategory as never,
            subCategory: q.subCategory,
            questionImpact: questionImpact as never,
            buyerSensitivity: buyerSensitivity as never,
            definitionNote: q.definitionNote,
            helpText: q.helpText,
            riskDefinition: meta.riskDefinition,
            primaryValueLever: meta.primaryValueLever,
            relatedQuestionIds: q.relatedQuestions || [],
            relatedModules: meta.relatedModules || [],
            isActive: true,
          }
        })
        projectQuestionId = existingQuestion.id
        stats.questionsUpdated++

        // Delete existing options, strategies, and tasks to recreate
        await prisma.projectTaskTemplate.deleteMany({
          where: { strategy: { questionId: projectQuestionId } }
        })
        await prisma.projectStrategy.deleteMany({
          where: { questionId: projectQuestionId }
        })
        await prisma.projectQuestionOption.deleteMany({
          where: { questionId: projectQuestionId }
        })
      } else {
        // Create new question
        const newQuestion = await prisma.projectQuestion.create({
          data: {
            moduleId: module.moduleId,
            questionId: q.id,
            questionText: q.questionText,
            briCategory: briCategory as never,
            subCategory: q.subCategory,
            questionImpact: questionImpact as never,
            buyerSensitivity: buyerSensitivity as never,
            definitionNote: q.definitionNote,
            helpText: q.helpText,
            riskDefinition: meta.riskDefinition,
            primaryValueLever: meta.primaryValueLever,
            relatedQuestionIds: q.relatedQuestions || [],
            relatedModules: meta.relatedModules || [],
            isActive: true,
          }
        })
        projectQuestionId = newQuestion.id
        stats.questionsCreated++
      }

      // Create options
      const optionIdMap: Record<string, string> = {} // Maps optionId (A,B,C,D) to database id
      for (let i = 0; i < q.options.length; i++) {
        const opt = q.options[i]
        const createdOption = await prisma.projectQuestionOption.create({
          data: {
            questionId: projectQuestionId,
            optionId: opt.optionId,
            optionText: opt.optionText,
            scoreValue: opt.score,
            buyerInterpretation: opt.buyerInterpretation,
            displayOrder: i + 1,
          }
        })
        optionIdMap[opt.optionId] = createdOption.id
        stats.optionsCreated++
      }

      // Create strategies and tasks
      for (const strategy of module.strategies) {
        const strategyType = strategyTypeMap[strategy.strategyType]
        if (!strategyType) {
          console.log(`  ⚠️  Unknown strategy type "${strategy.strategyType}" in ${path.basename(filePath)}`)
          continue
        }

        const createdStrategy = await prisma.projectStrategy.create({
          data: {
            questionId: projectQuestionId,
            strategyId: strategy.strategyId,
            strategyName: strategy.strategyName,
            strategyDescription: strategy.strategyDescription,
            strategyType: strategyType as never,
            upgradeFromScore: strategy.upgradeFromScore,
            maxScoreAchievable: strategy.maxScoreAchievable,
            estimatedEffort: strategy.estimatedEffort,
            estimatedTimeline: strategy.estimatedTimeline,
            applicableWhen: strategy.applicableWhen,
          }
        })
        stats.strategiesCreated++

        // Create tasks
        for (const task of strategy.tasks) {
          const ownerRole = ownerRoleMap[task.ownerRole] || 'FOUNDER'
          const timebox = timeboxMap[task.timebox] || 'NEAR_30_90'
          const effortLevel = effortMap[task.effortLevel] || 'MODERATE'
          const complexity = complexityMap[task.complexity] || 'MODERATE'
          const riskCategory = categoryMap[task.riskCategory] || briCategory

          // Find option IDs for upgrade mapping
          let upgradesFromOptionId: string | undefined
          let upgradesToOptionId: string | undefined

          if (task.upgradesScoreFrom !== undefined) {
            // Find option with matching score
            const fromOption = q.options.find(o => Math.abs(o.score - task.upgradesScoreFrom!) < 0.01)
            if (fromOption) {
              upgradesFromOptionId = optionIdMap[fromOption.optionId]
            }
          }

          if (task.upgradesScoreTo !== undefined) {
            // Find option with matching score
            const toOption = q.options.find(o => Math.abs(o.score - task.upgradesScoreTo!) < 0.01)
            if (toOption) {
              upgradesToOptionId = optionIdMap[toOption.optionId]
            }
          }

          // Use taskId or id, whichever is present
          const taskIdValue = task.taskId || task.id || `TASK-${strategy.strategyId}-${task.sequence}`

          await prisma.projectTaskTemplate.create({
            data: {
              strategyId: createdStrategy.id,
              taskId: taskIdValue,
              sequence: task.sequence,
              title: task.title,
              primaryVerb: task.primaryVerb,
              verbTier: task.verbTier ?? 1,  // Default to tier 1 if not specified
              object: task.object,
              outcome: task.outcome,
              ownerRole: ownerRole as never,
              timebox: timebox as never,
              effortLevel: effortLevel as never,
              complexity: complexity as never,
              estimatedHours: task.estimatedHours,
              deliverables: task.deliverables || [],
              evidence: task.evidence || [],
              riskCategory: riskCategory as never,
              dependencies: task.dependencies || [],
              blockedBy: task.blockedBy || [],
              upgradesFromScore: task.upgradesScoreFrom,
              upgradesToScore: task.upgradesScoreTo,
              upgradesFromOptionId,
              upgradesToOptionId,
              deferReasonCode: task.deferReasonCode,
              companionVerbs: task.companionVerbs || [],
              reEvaluationDate: task.reEvaluationDate,
              valueImpactState: task.valueImpactState,
              mitigationSummary: task.mitigationSummary,
            }
          })
          stats.tasksCreated++
        }
      }

      // Progress indicator
      if ((stats.questionsCreated + stats.questionsUpdated) % 50 === 0) {
        console.log(`  Processed ${stats.questionsCreated + stats.questionsUpdated} questions...`)
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${path.basename(filePath)}:`, error)
      stats.errors++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Import Summary')
  console.log('='.repeat(60))
  console.log(`Questions created: ${stats.questionsCreated}`)
  console.log(`Questions updated: ${stats.questionsUpdated}`)
  console.log(`Options created: ${stats.optionsCreated}`)
  console.log(`Strategies created: ${stats.strategiesCreated}`)
  console.log(`Task templates created: ${stats.tasksCreated}`)
  console.log(`Errors: ${stats.errors}`)

  // Verify counts
  const totalQuestions = await prisma.projectQuestion.count()
  const totalOptions = await prisma.projectQuestionOption.count()
  const totalStrategies = await prisma.projectStrategy.count()
  const totalTasks = await prisma.projectTaskTemplate.count()

  console.log(`\nDatabase totals:`)
  console.log(`  Project Questions: ${totalQuestions}`)
  console.log(`  Project Options: ${totalOptions}`)
  console.log(`  Project Strategies: ${totalStrategies}`)
  console.log(`  Project Task Templates: ${totalTasks}`)

  // Category breakdown
  console.log(`\nQuestions by category:`)
  const categoryBreakdown = await prisma.projectQuestion.groupBy({
    by: ['briCategory'],
    _count: { id: true }
  })
  for (const cat of categoryBreakdown) {
    console.log(`  ${cat.briCategory}: ${cat._count.id}`)
  }

  await prisma.$disconnect()
  await pool.end()

  console.log('\n✅ Import completed!')
}

main().catch((e) => {
  console.error('Import failed:', e)
  process.exit(1)
})
