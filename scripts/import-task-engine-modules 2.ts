/**
 * Task Engine Module Import Script
 *
 * This script imports the 596 JSON module files from the Task Engine into the database.
 * It creates/updates:
 * - Questions (with briCategory, questionText, helpText, etc.)
 * - QuestionOptions (with scoreValue mappings)
 *
 * Run with: npx tsx scripts/import-task-engine-modules.ts
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
  taskId: string
  sequence: number
  title: string
  primaryVerb: string
  verbTier: number
  object: string
  outcome: string
  ownerRole: string
  timebox: string
  effortLevel: string
  complexity: string
  estimatedHours: number
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
  // Handle additional categories that might be in the JSON
  'PERSONAL_READINESS': 'PERSONAL',
}

// Map JSON impact to maxImpactPoints
const impactToPoints: Record<string, number> = {
  'CRITICAL': 15,
  'HIGH': 12,
  'MEDIUM': 8,
  'LOW': 5,
}

// Map effort levels
const effortMap: Record<string, string> = {
  'MINIMAL': 'MINIMAL',
  'LOW': 'LOW',
  'MODERATE': 'MODERATE',
  'HIGH': 'HIGH',
  'MAJOR': 'MAJOR',
}

// Map complexity levels
const complexityMap: Record<string, string> = {
  'SIMPLE': 'SIMPLE',
  'MODERATE': 'MODERATE',
  'COMPLEX': 'COMPLEX',
  'STRATEGIC': 'STRATEGIC',
}

// Map action types based on verb tier
const verbToActionType: Record<string, string> = {
  'DOCUMENT': 'TYPE_II_DOCUMENTATION',
  'FORMALIZE': 'TYPE_IV_INSTITUTIONALIZE',
  'VALIDATE': 'TYPE_I_EVIDENCE',
  'REMEDIATE': 'TYPE_V_RISK_REDUCTION',
  'STABILIZE': 'TYPE_III_OPERATIONAL',
  'PROTECT': 'TYPE_V_RISK_REDUCTION',
  'ALIGN': 'TYPE_VI_ALIGNMENT',
  'SIMPLIFY': 'TYPE_III_OPERATIONAL',
  'SEGREGATE': 'TYPE_III_OPERATIONAL',
  'RESTRUCTURE': 'TYPE_IV_INSTITUTIONALIZE',
  'CENTRALIZE': 'TYPE_IV_INSTITUTIONALIZE',
  'DELEGATE': 'TYPE_IV_INSTITUTIONALIZE',
  'PRIORITIZE': 'TYPE_VI_ALIGNMENT',
  'PHASE': 'TYPE_VII_READINESS',
  'PILOT': 'TYPE_VII_READINESS',
  'TRANSITION': 'TYPE_VII_READINESS',
  'DEFER': 'TYPE_X_DEFER',
  'DISCLOSE': 'TYPE_VIII_SIGNALING',
  'FRAME': 'TYPE_VIII_SIGNALING',
  'COMMIT': 'TYPE_VI_ALIGNMENT',
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
  console.log('Task Engine Module Import')
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

  // Check for existing assessment responses
  const existingResponses = await prisma.assessmentResponse.count()
  if (existingResponses > 0) {
    console.log(`\n⚠️  Warning: ${existingResponses} assessment responses exist.`)
    console.log('Importing new questions will not delete existing ones.')
    console.log('Consider creating a migration strategy for existing data.\n')
  }

  // Track stats
  let questionsCreated = 0
  let questionsUpdated = 0
  let optionsCreated = 0
  let errors = 0

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

      // Calculate maxImpactPoints from questionImpact
      const maxImpactPoints = impactToPoints[q.questionImpact] || 8

      // Build helpText from module data
      const helpText = q.helpText
      const buyerLogic = meta.riskDefinition || q.definitionNote

      // Check if question with this moduleId already exists
      // We'll use a unique constraint approach or upsert
      const existingQuestion = await prisma.question.findFirst({
        where: {
          questionText: q.questionText
        }
      })

      let questionId: string

      if (existingQuestion) {
        // Update existing question
        await prisma.question.update({
          where: { id: existingQuestion.id },
          data: {
            briCategory: briCategory as never,
            helpText,
            buyerLogic: buyerLogic?.substring(0, 200),
            maxImpactPoints,
            isActive: true,
          }
        })
        questionId = existingQuestion.id
        questionsUpdated++
      } else {
        // Get next display order for this category
        const maxOrder = await prisma.question.aggregate({
          where: { briCategory: briCategory as never },
          _max: { displayOrder: true }
        })
        const displayOrder = (maxOrder._max.displayOrder || 0) + 1

        // Create new question
        const newQuestion = await prisma.question.create({
          data: {
            briCategory: briCategory as never,
            questionText: q.questionText,
            helpText,
            buyerLogic: buyerLogic?.substring(0, 200),
            displayOrder,
            maxImpactPoints,
            isActive: true,
          }
        })
        questionId = newQuestion.id
        questionsCreated++
      }

      // Delete existing options for this question and recreate
      await prisma.questionOption.deleteMany({
        where: { questionId }
      })

      // Create options in order (A=1.0, B=0.70, C=0.35, D=0.00)
      for (let i = 0; i < q.options.length; i++) {
        const opt = q.options[i]
        await prisma.questionOption.create({
          data: {
            questionId,
            optionText: opt.optionText,
            scoreValue: opt.score,
            displayOrder: i + 1,
          }
        })
        optionsCreated++
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${path.basename(filePath)}:`, error)
      errors++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Import Summary')
  console.log('='.repeat(60))
  console.log(`Questions created: ${questionsCreated}`)
  console.log(`Questions updated: ${questionsUpdated}`)
  console.log(`Options created: ${optionsCreated}`)
  console.log(`Errors: ${errors}`)

  // Verify counts
  const totalQuestions = await prisma.question.count()
  const totalOptions = await prisma.questionOption.count()
  console.log(`\nDatabase totals:`)
  console.log(`  Questions: ${totalQuestions}`)
  console.log(`  Options: ${totalOptions}`)

  await prisma.$disconnect()
  await pool.end()

  console.log('\n✅ Import completed!')
}

main().catch((e) => {
  console.error('Import failed:', e)
  process.exit(1)
})
