/**
 * Generate Task Templates from JSON Modules
 *
 * This script reads all 596 JSON module files and generates an updated
 * task-templates.ts file with comprehensive templates for all questions.
 *
 * Run with: npx tsx scripts/generate-task-templates-from-modules.ts
 */

import * as fs from 'fs'
import * as path from 'path'

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

interface TaskModule {
  moduleVersion: string
  generatedDate: string
  moduleId: string
  question: ModuleQuestion
  moduleMetadata: {
    riskDefinition: string
    buyerSensitivity: string
    typicalBuyerResponses: string[]
    primaryValueLever: string
    relatedModules: string[]
  }
  strategies: ModuleStrategy[]
  suppressionRules: unknown[]
  validationRules: unknown
}

// Map JSON categories to TypeScript enum values
const categoryMap: Record<string, string> = {
  'FINANCIAL': 'FINANCIAL',
  'TRANSFERABILITY': 'TRANSFERABILITY',
  'OPERATIONAL': 'OPERATIONAL',
  'MARKET': 'MARKET',
  'LEGAL_TAX': 'LEGAL_TAX',
  'PERSONAL': 'PERSONAL',
  'PERSONAL_READINESS': 'PERSONAL',
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

// Map verbs to action types
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

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
}

function createQuestionPattern(questionText: string): string {
  // Extract key words for pattern matching
  const words = questionText
    .toLowerCase()
    .replace(/[?.,!]/g, '')
    .split(' ')
    .filter(w => w.length > 3 && !['what', 'your', 'have', 'does', 'would', 'assess', 'rate', 'describe', 'overall'].includes(w))
    .slice(0, 5)

  // Create a pattern that matches key words
  if (words.length >= 2) {
    return words.slice(0, 3).join('.*')
  }
  return words[0] || questionText.substring(0, 30)
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
  console.log('Generate Task Templates from JSON Modules')
  console.log('='.repeat(60))

  // Path to Task Engine modules
  const taskEngineDir = path.resolve(__dirname, '../../Task Engine/Tasks')
  const outputPath = path.resolve(__dirname, '../src/lib/playbook/task-templates-generated.ts')

  console.log(`\nSearching for modules in: ${taskEngineDir}`)

  const moduleFiles = await findJsonModules(taskEngineDir)
  console.log(`Found ${moduleFiles.length} module files`)

  if (moduleFiles.length === 0) {
    console.log('No module files found. Exiting.')
    return
  }

  // Track unique templates by question text hash
  const templates: Map<string, {
    questionPattern: string
    questionText: string
    moduleId: string
    briCategory: string
    scoreThreshold: number
    tasks: {
      title: string
      description: string
      actionType: string
      effortLevel: string
      complexity: string
      estimatedHours: number
      upgradeFromScore: number
      upgradeToScore: number
    }[]
  }> = new Map()

  let modulesProcessed = 0
  let tasksExtracted = 0

  // Process each module
  for (const filePath of moduleFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const taskModule: TaskModule = JSON.parse(content)

      const q = taskModule.question
      const questionKey = q.questionText.toLowerCase().trim()

      // Map category
      let briCategory = categoryMap[q.briCategory]
      if (!briCategory) {
        briCategory = 'OPERATIONAL'
      }

      // Determine score threshold (generate tasks if below this)
      // Using 0.67 as default since Option B typically scores 0.70
      const scoreThreshold = 0.67

      // Create pattern for matching
      const questionPattern = createQuestionPattern(q.questionText)

      // Get or create template entry
      let template = templates.get(questionKey)
      if (!template) {
        template = {
          questionPattern,
          questionText: q.questionText,
          moduleId: module.moduleId,
          briCategory,
          scoreThreshold,
          tasks: []
        }
        templates.set(questionKey, template)
      }

      // Extract tasks from all strategies
      for (const strategy of module.strategies) {
        for (const task of strategy.tasks) {
          // Only include tasks with upgrade scores
          if (task.upgradesScoreFrom !== undefined && task.upgradesScoreTo !== undefined) {
            const actionType = verbToActionType[task.primaryVerb] || 'TYPE_II_DOCUMENTATION'
            const effortLevel = effortMap[task.effortLevel] || 'MODERATE'
            const complexity = complexityMap[task.complexity] || 'MODERATE'

            // Build description from task properties
            const description = task.outcome
              ? `${task.title}. ${task.outcome}`
              : task.title

            template.tasks.push({
              title: task.title,
              description,
              actionType,
              effortLevel,
              complexity,
              estimatedHours: task.estimatedHours || 20,
              upgradeFromScore: task.upgradesScoreFrom,
              upgradeToScore: task.upgradesScoreTo
            })
            tasksExtracted++
          }
        }
      }

      modulesProcessed++
    } catch (error) {
      console.error(`Error processing ${path.basename(filePath)}:`, error)
    }
  }

  // Generate TypeScript file
  let output = `// Task templates generated from Task Engine JSON modules
// Auto-generated on ${new Date().toISOString()}
// DO NOT EDIT DIRECTLY - regenerate using: npx tsx scripts/generate-task-templates-from-modules.ts

export type ActionItemType =
  | 'TYPE_I_EVIDENCE'
  | 'TYPE_II_DOCUMENTATION'
  | 'TYPE_III_OPERATIONAL'
  | 'TYPE_IV_INSTITUTIONALIZE'
  | 'TYPE_V_RISK_REDUCTION'
  | 'TYPE_VI_ALIGNMENT'
  | 'TYPE_VII_READINESS'
  | 'TYPE_VIII_SIGNALING'
  | 'TYPE_IX_OPTIONS'
  | 'TYPE_X_DEFER'

export type EffortLevel = 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'MAJOR'
export type ComplexityLevel = 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'STRATEGIC'
export type BriCategory = 'FINANCIAL' | 'TRANSFERABILITY' | 'OPERATIONAL' | 'MARKET' | 'LEGAL_TAX' | 'PERSONAL'

export interface TaskTemplate {
  questionPattern: string
  questionText: string
  moduleId: string
  briCategory: BriCategory
  scoreThreshold: number
  tasks: Array<{
    title: string
    description: string
    actionType: ActionItemType
    effortLevel: EffortLevel
    complexity: ComplexityLevel
    estimatedHours: number
    upgradeFromScore: number
    upgradeToScore: number
  }>
}

export const taskTemplates: TaskTemplate[] = [
`

  // Sort templates by category then by questionText
  const sortedTemplates = Array.from(templates.values())
    .filter(t => t.tasks.length > 0)
    .sort((a, b) => {
      if (a.briCategory !== b.briCategory) {
        return a.briCategory.localeCompare(b.briCategory)
      }
      return a.questionText.localeCompare(b.questionText)
    })

  let currentCategory = ''

  for (const template of sortedTemplates) {
    // Add category header comment
    if (template.briCategory !== currentCategory) {
      currentCategory = template.briCategory
      output += `\n  // ==========================================\n`
      output += `  // ${currentCategory}\n`
      output += `  // ==========================================\n`
    }

    // Sort tasks by upgradeFromScore
    const sortedTasks = template.tasks.sort((a, b) => a.upgradeFromScore - b.upgradeFromScore)

    output += `  {
    questionPattern: '${escapeString(template.questionPattern)}',
    questionText: '${escapeString(template.questionText)}',
    moduleId: '${template.moduleId}',
    briCategory: '${template.briCategory}',
    scoreThreshold: ${template.scoreThreshold},
    tasks: [
`

    for (const task of sortedTasks) {
      output += `      {
        title: '${escapeString(task.title)}',
        description: '${escapeString(task.description)}',
        actionType: '${task.actionType}',
        effortLevel: '${task.effortLevel}',
        complexity: '${task.complexity}',
        estimatedHours: ${task.estimatedHours},
        upgradeFromScore: ${task.upgradeFromScore.toFixed(2)},
        upgradeToScore: ${task.upgradeToScore.toFixed(2)},
      },
`
    }

    output += `    ],
  },
`
  }

  output += `]

// Get templates matching a question
export function getTemplatesForQuestion(questionText: string): TaskTemplate[] {
  return taskTemplates.filter(template =>
    new RegExp(template.questionPattern, 'i').test(questionText)
  )
}

// Get template by module ID
export function getTemplateByModuleId(moduleId: string): TaskTemplate | undefined {
  return taskTemplates.find(t => t.moduleId === moduleId)
}

// Get all templates for a category
export function getTemplatesByCategory(category: BriCategory): TaskTemplate[] {
  return taskTemplates.filter(t => t.briCategory === category)
}
`

  // Write output file
  fs.writeFileSync(outputPath, output)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('Generation Summary')
  console.log('='.repeat(60))
  console.log(`Modules processed: ${modulesProcessed}`)
  console.log(`Unique questions: ${sortedTemplates.length}`)
  console.log(`Total tasks extracted: ${tasksExtracted}`)
  console.log(`Output file: ${outputPath}`)

  // Category breakdown
  console.log('\nTasks by category:')
  const categoryStats: Record<string, number> = {}
  for (const template of sortedTemplates) {
    categoryStats[template.briCategory] = (categoryStats[template.briCategory] || 0) + template.tasks.length
  }
  for (const [cat, count] of Object.entries(categoryStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count} tasks`)
  }

  console.log('\n✅ Generation completed!')
  console.log('\nTo use the generated templates, update src/lib/playbook/task-templates.ts to import from task-templates-generated.ts')
}

main().catch((e) => {
  console.error('Generation failed:', e)
  process.exit(1)
})
