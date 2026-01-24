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

function mapPhaseToBRI(phase: string, module: string): string {
  const text = `${phase} ${module}`.toLowerCase()
  if (text.includes('financial') || text.includes('cash flow') || text.includes('working capital') ||
      text.includes('earnings') || text.includes('revenue') || text.includes('gross margin') ||
      text.includes('recurring')) return 'FINANCIAL'
  if (text.includes('legal') || text.includes('tax') || text.includes('contract') ||
      text.includes('litigation') || text.includes('corporate structure') || text.includes('employment') ||
      text.includes('ip') || text.includes('intellectual property')) return 'LEGAL'
  if (text.includes('market') || text.includes('brand') || text.includes('competitive') ||
      text.includes('growth')) return 'MARKET'
  if (text.includes('operational') || text.includes('cyber') || text.includes('scalab') ||
      text.includes('technology') || text.includes('vendor')) return 'OPERATIONAL'
  if (text.includes('personal') || text.includes('exit timeline') || text.includes('asset separation') ||
      text.includes('employee awareness') || text.includes('post-exit') || text.includes('transition commitment')) return 'PERSONAL'
  if (text.includes('transfer') || text.includes('customer relationship') || text.includes('delegation') ||
      text.includes('founder') || text.includes('key employee') || text.includes('management team') ||
      text.includes('succession') || text.includes('documentation') || text.includes('process doc')) return 'TRANSFERABILITY'
  return 'FINANCIAL'
}

function extractSubCategory(section: string): string {
  // Extract just the descriptive part after "Section X:"
  const match = section.match(/Section [A-F]:\s*(.+)/)
  return match ? match[1] : section
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const docPath = '/Users/bradfeldman/.claude/projects/-Users-bradfeldman/0a141bf5-727d-4d3f-b3fc-895fe75a75fd/tool-results/toolu_01HiLvWpWVxR87JntPRLE98e.txt'
  const docContent = fs.readFileSync(docPath, 'utf-8')
  const lines = docContent.split('\n').map(l => l.replace(/^\s*\d+→/, '').trim())

  const existingQuestions = await prisma.question.findMany({
    where: { isActive: true },
    include: { options: { orderBy: { displayOrder: 'asc' } } },
    orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }]
  })

  // New headers with better structure
  const headers = [
    'Source',
    'BRI Category',
    'Sub-Category',
    'Question #',
    'Question Text',
    'Question Impact (H/M/L)',
    'Help Text (Buyer Logic)',
    // Options with individual scores (not forced to specific values)
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
    // Strategy A
    'Strategy A Name',
    'Strategy A Description',
    'Strategy A Tasks (semicolon separated)',
    'Strategy A Max Score',
    // Strategy B
    'Strategy B Name',
    'Strategy B Description',
    'Strategy B Tasks (semicolon separated)',
    'Strategy B Max Score',
    // Strategy C (Accept)
    'Strategy C Name',
    'Strategy C Tasks',
    'Strategy C Max Score',
    'Suppresses Questions (IDs)',
    // Meta
    'Related Questions',
    'Notes'
  ]

  const rows: string[][] = []

  // Add existing questions
  for (const q of existingQuestions) {
    const opts = q.options || []
    rows.push([
      'EXISTING',
      q.briCategory,
      '', // Sub-category - needs to be filled in
      String(q.displayOrder),
      q.questionText,
      '', // Impact - needs to be assessed
      q.helpText || '',
      opts[0]?.optionText || '', opts[0]?.scoreValue?.toString() || '',
      opts[1]?.optionText || '', opts[1]?.scoreValue?.toString() || '',
      opts[2]?.optionText || '', opts[2]?.scoreValue?.toString() || '',
      opts[3]?.optionText || '', opts[3]?.scoreValue?.toString() || '',
      opts[4]?.optionText || '', opts[4]?.scoreValue?.toString() || '',
      '', '', '', '', // Strategy A
      '', '', '', '', // Strategy B
      '', '', '', '', // Strategy C
      '', ''
    ])
  }

  // Parse new questions
  let currentPhase = ''
  let currentModule = ''
  let currentSection = ''
  let globalQuestionNum = existingQuestions.length
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('Phase ') && line.includes(':')) {
      currentPhase = line
      currentModule = ''
      currentSection = ''
      i++
      continue
    }

    if (line.startsWith('Module ') && line.includes(':')) {
      currentModule = line
      currentSection = ''
      i++
      continue
    }

    if (line.startsWith('Section ') && line.includes(':')) {
      currentSection = line
      i++
      continue
    }

    const qMatch = line.match(/^(\d+)\.\s+(.+\?)$/)
    if (qMatch) {
      globalQuestionNum++
      const questionText = qMatch[2]

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

      const briCategory = mapPhaseToBRI(currentPhase, currentModule)
      const subCategory = extractSubCategory(currentSection)

      // Leave scores BLANK for user to fill in based on buyer risk perception
      rows.push([
        'NEW',
        briCategory,
        subCategory,
        String(globalQuestionNum),
        questionText,
        '', // Impact - user needs to assess
        '', // Help text
        options[0] || '', '', // Score blank - user fills based on buyer risk
        options[1] || '', '',
        options[2] || '', '',
        options[3] || '', '',
        options[4] || '', '',
        '', '', '', '', // Strategy A
        '', '', '', '', // Strategy B
        '', '', '', '', // Strategy C
        '', ''
      ])
      continue
    }
    i++
  }

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  const outputPath = '/Users/bradfeldman/Documents/Exit-OSx_v2/Task Engine/Question_Strategy_Template_v2.csv'
  fs.writeFileSync(outputPath, csvContent)

  console.log(`\nSpreadsheet created: ${outputPath}`)
  console.log(`- Existing questions: ${existingQuestions.length}`)
  console.log(`- New questions: ${rows.length - existingQuestions.length}`)
  console.log(`- Total: ${rows.length}`)
  console.log(`\nColumns: ${headers.length}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(console.error)
