import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'

config({ path: '.env.local' })

// CSV escape helper
function escapeCSV(str: string): string {
  if (!str) return ''
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Get existing questions from database
  const existingQuestions = await prisma.question.findMany({
    where: { isActive: true },
    include: { options: { orderBy: { displayOrder: 'asc' } } },
    orderBy: [{ briCategory: 'asc' }, { displayOrder: 'asc' }]
  })

  // Headers
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
    'Strategy C Name (Accept Risk)',
    'Strategy C Effect (Suppresses)',
    'Related Questions',
    'Notes'
  ]

  const rows: string[][] = []

  // Add existing questions from database
  console.log(`Found ${existingQuestions.length} existing questions in database`)

  for (const q of existingQuestions) {
    const options = q.options || []
    const row = [
      'EXISTING (Database)',
      '', // Phase
      q.briCategory, // Module/Section
      String(q.displayOrder),
      q.questionText,
      q.briCategory,
      q.helpText || '',
      options[0]?.optionText || '',
      options[0]?.scoreValue?.toString() || '',
      options[1]?.optionText || '',
      options[1]?.scoreValue?.toString() || '',
      options[2]?.optionText || '',
      options[2]?.scoreValue?.toString() || '',
      options[3]?.optionText || '',
      options[3]?.scoreValue?.toString() || '',
      options[4]?.optionText || '',
      options[4]?.scoreValue?.toString() || '',
      // Example strategies for existing questions
      q.questionText.toLowerCase().includes('customer') ? 'Diversify Customer Base' : '',
      q.questionText.toLowerCase().includes('customer') ? '1. Develop acquisition strategy\n2. Launch targeted marketing\n3. Achieve diversification targets' : '',
      q.questionText.toLowerCase().includes('customer') ? 'Secure Existing Relationships' : '',
      q.questionText.toLowerCase().includes('customer') ? '1. Negotiate long-term contracts\n2. Obtain commitment letters' : '',
      'Accept & Document Risk',
      'Suppresses related concentration tasks',
      '',
      'EXISTING - Review and update strategies as needed'
    ]
    rows.push(row)
  }

  // Write CSV
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  const outputPath = '/Users/bradfeldman/Documents/Exit-OSx_v2/Task Engine/Question_Strategy_Template.csv'
  fs.writeFileSync(outputPath, csvContent)
  console.log(`\nCSV written to: ${outputPath}`)
  console.log(`Total rows: ${rows.length}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(console.error)
