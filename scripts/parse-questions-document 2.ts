import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'

config({ path: '.env.local' })

function escapeCSV(str: string): string {
  if (!str) return ''
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Map phases to BRI categories
function mapPhaseToBRI(phase: string, module: string): string {
  const phaseModule = `${phase} ${module}`.toLowerCase()

  if (phaseModule.includes('financial') || phaseModule.includes('cash flow') ||
      phaseModule.includes('working capital') || phaseModule.includes('earnings') ||
      phaseModule.includes('revenue') || phaseModule.includes('gross margin')) {
    return 'FINANCIAL'
  }
  if (phaseModule.includes('legal') || phaseModule.includes('tax') ||
      phaseModule.includes('contracts') || phaseModule.includes('litigation') ||
      phaseModule.includes('corporate structure') || phaseModule.includes('employment') ||
      phaseModule.includes('ip') || phaseModule.includes('intellectual property')) {
    return 'LEGAL'
  }
  if (phaseModule.includes('market') || phaseModule.includes('brand') ||
      phaseModule.includes('competitive') || phaseModule.includes('growth')) {
    return 'MARKET'
  }
  if (phaseModule.includes('operational') || phaseModule.includes('cyber') ||
      phaseModule.includes('scalab') || phaseModule.includes('technology') ||
      phaseModule.includes('vendor')) {
    return 'OPERATIONAL'
  }
  if (phaseModule.includes('personal') || phaseModule.includes('exit') ||
      phaseModule.includes('asset separation') || phaseModule.includes('employee awareness') ||
      phaseModule.includes('post-exit') || phaseModule.includes('transition')) {
    return 'PERSONAL'
  }
  if (phaseModule.includes('transfer') || phaseModule.includes('customer relationship') ||
      phaseModule.includes('delegation') || phaseModule.includes('founder') ||
      phaseModule.includes('key employee') || phaseModule.includes('management team') ||
      phaseModule.includes('succession') || phaseModule.includes('documentation')) {
    return 'TRANSFERABILITY'
  }
  return 'FINANCIAL'
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Read the document
  const docPath = '/Users/bradfeldman/.claude/projects/-Users-bradfeldman/0a141bf5-727d-4d3f-b3fc-895fe75a75fd/tool-results/toolu_01HiLvWpWVxR87JntPRLE98e.txt'
  const docContent = fs.readFileSync(docPath, 'utf-8')
  const lines = docContent.split('\n').map(l => l.replace(/^\s*\d+→/, '').trim())

  // Get existing questions
  const existingQuestions = await prisma.question.findMany({
    where: { isActive: true },
    include: { options: { orderBy: { displayOrder: 'asc' } } },
    orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }]
  })

  const headers = [
    'Source',
    'Phase',
    'Module/Section',
    'Question Number',
    'Question Text',
    'BRI Category',
    'Help Text',
    'Option A Text',
    'Option A Score',
    'Option B Text',
    'Option B Score',
    'Option C Text',
    'Option C Score',
    'Option D Text',
    'Option D Score',
    'Option E Text',
    'Option E Score',
    'Strategy A Name',
    'Strategy A Tasks',
    'Strategy B Name',
    'Strategy B Tasks',
    'Strategy C (Accept Risk)',
    'Suppresses Questions',
    'Related Questions',
    'Notes'
  ]

  const rows: string[][] = []

  // Add existing questions
  for (const q of existingQuestions) {
    const opts = q.options || []
    rows.push([
      'EXISTING',
      '',
      q.briCategory,
      String(q.displayOrder),
      q.questionText,
      q.briCategory,
      q.helpText || '',
      opts[0]?.optionText || '', opts[0]?.scoreValue?.toString() || '',
      opts[1]?.optionText || '', opts[1]?.scoreValue?.toString() || '',
      opts[2]?.optionText || '', opts[2]?.scoreValue?.toString() || '',
      opts[3]?.optionText || '', opts[3]?.scoreValue?.toString() || '',
      opts[4]?.optionText || '', opts[4]?.scoreValue?.toString() || '',
      '', '', '', '', '', '', '', 'Review strategies'
    ])
  }

  // Parse new questions from document
  let currentPhase = ''
  let currentModule = ''
  let currentSection = ''
  let questionNum = 0
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Detect Phase
    if (line.startsWith('Phase ') && line.includes(':')) {
      currentPhase = line
      currentModule = ''
      currentSection = ''
      questionNum = 0
      i++
      continue
    }

    // Detect Module
    if (line.startsWith('Module ') && line.includes(':')) {
      currentModule = line
      currentSection = ''
      questionNum = 0
      i++
      continue
    }

    // Detect Section
    if (line.startsWith('Section ') && line.includes(':')) {
      currentSection = line
      i++
      continue
    }

    // Detect Question (starts with number followed by period)
    const qMatch = line.match(/^(\d+)\.\s+(.+\?)$/)
    if (qMatch) {
      questionNum = parseInt(qMatch[1])
      const questionText = qMatch[2]

      // Collect options (A. through E.)
      const options: string[] = []
      i++
      while (i < lines.length && options.length < 5) {
        const optLine = lines[i]
        const optMatch = optLine.match(/^([A-E])\.\s+(.+)$/)
        if (optMatch) {
          options.push(optMatch[2])
          i++
        } else if (optLine.match(/^(\d+)\.\s+/) || optLine.startsWith('Section ') ||
                   optLine.startsWith('Phase ') || optLine.startsWith('Module ')) {
          break
        } else {
          i++
        }
      }

      // Calculate scores (A=best=1.00, E=worst=0.00 typically, but some are reversed)
      // Standard scoring: A=1.00, B=0.75, C=0.50, D=0.25, E=0.00
      const scores = options.length === 5 ? ['1.00', '0.75', '0.50', '0.25', '0.00'] :
                     options.length === 4 ? ['1.00', '0.67', '0.33', '0.00'] :
                     options.length === 3 ? ['1.00', '0.50', '0.00'] :
                     options.length === 2 ? ['1.00', '0.00'] : []

      const briCategory = mapPhaseToBRI(currentPhase, currentModule)

      rows.push([
        'NEW',
        currentPhase,
        `${currentModule} - ${currentSection}`,
        String(questionNum),
        questionText,
        briCategory,
        '', // Help text - to be filled
        options[0] || '', scores[0] || '',
        options[1] || '', scores[1] || '',
        options[2] || '', scores[2] || '',
        options[3] || '', scores[3] || '',
        options[4] || '', scores[4] || '',
        '', '', '', '', '', '', '', ''
      ])
      continue
    }
    i++
  }

  // Write CSV
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  const outputPath = '/Users/bradfeldman/Documents/Exit-OSx_v2/Task Engine/Question_Strategy_Template_Complete.csv'
  fs.writeFileSync(outputPath, csvContent)

  const existingCount = existingQuestions.length
  const newCount = rows.length - existingCount
  console.log(`\nSpreadsheet created: ${outputPath}`)
  console.log(`- Existing questions: ${existingCount}`)
  console.log(`- New questions parsed: ${newCount}`)
  console.log(`- Total rows: ${rows.length}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(console.error)
