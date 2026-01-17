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
      text.includes('ip') || text.includes('intellectual property')) return 'LEGAL_TAX'
  if (text.includes('market') || text.includes('brand') || text.includes('competitive') ||
      text.includes('growth')) return 'MARKET'
  if (text.includes('operational') || text.includes('cyber') || text.includes('scalab') ||
      text.includes('technology') || text.includes('vendor')) return 'OPERATIONAL'
  if (text.includes('personal') || text.includes('exit timeline') || text.includes('asset separation') ||
      text.includes('employee awareness') || text.includes('post-exit') || text.includes('transition commitment')) return 'PERSONAL_READINESS'
  if (text.includes('transfer') || text.includes('customer relationship') || text.includes('delegation') ||
      text.includes('founder') || text.includes('key employee') || text.includes('management team') ||
      text.includes('succession') || text.includes('documentation') || text.includes('process doc')) return 'TRANSFERABILITY'
  return 'FINANCIAL'
}

function extractSubCategory(section: string): string {
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

  // New headers with canonical verbs and full task structure
  const headers = [
    // Question Identity
    'Source',
    'BRI Category',
    'Sub-Category',
    'Question #',
    'Question Text',
    'Question Impact (H/M/L)',
    'Help Text (Buyer Logic)',

    // Answer Options with flexible scores
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

    // Strategy A - Full Fix
    'Strategy A Name',
    'Strategy A Max Score',
    'Strategy A Task 1 Title',
    'Strategy A Task 1 Verb',
    'Strategy A Task 1 Object',
    'Strategy A Task 1 Outcome',
    'Strategy A Task 1 Deliverables',
    'Strategy A Task 1 Evidence',
    'Strategy A Task 1 Owner',
    'Strategy A Task 1 Timebox',
    'Strategy A Task 2 Title',
    'Strategy A Task 2 Verb',
    'Strategy A Task 2 Object',
    'Strategy A Task 2 Outcome',
    'Strategy A Task 2 Deliverables',
    'Strategy A Task 2 Evidence',
    'Strategy A Task 2 Owner',
    'Strategy A Task 2 Timebox',

    // Strategy B - Partial Mitigation
    'Strategy B Name',
    'Strategy B Max Score',
    'Strategy B Task 1 Title',
    'Strategy B Task 1 Verb',
    'Strategy B Task 1 Object',
    'Strategy B Task 1 Outcome',
    'Strategy B Task 1 Deliverables',
    'Strategy B Task 1 Evidence',
    'Strategy B Task 1 Owner',
    'Strategy B Task 1 Timebox',

    // Strategy C - Accept Risk (uses Tier 4 verbs)
    'Strategy C Name',
    'Strategy C Max Score',
    'Strategy C Primary Verb',
    'Strategy C Companion Verb',
    'Strategy C Defer Reason',
    'Strategy C Disclosure Summary',
    'Strategy C Re-evaluation Date',
    'Suppresses Questions',

    // Meta
    'Related Questions',
    'Notes'
  ]

  const rows: string[][] = []

  // Add existing questions
  for (const q of existingQuestions) {
    const opts = q.options || []
    const row = new Array(headers.length).fill('')
    row[0] = 'EXISTING'
    row[1] = q.briCategory
    row[2] = '' // Sub-category
    row[3] = String(q.displayOrder)
    row[4] = q.questionText
    row[5] = '' // Impact
    row[6] = q.helpText || ''
    // Options
    if (opts[0]) { row[7] = opts[0].optionText; row[8] = opts[0].scoreValue?.toString() || '' }
    if (opts[1]) { row[9] = opts[1].optionText; row[10] = opts[1].scoreValue?.toString() || '' }
    if (opts[2]) { row[11] = opts[2].optionText; row[12] = opts[2].scoreValue?.toString() || '' }
    if (opts[3]) { row[13] = opts[3].optionText; row[14] = opts[3].scoreValue?.toString() || '' }
    if (opts[4]) { row[15] = opts[4].optionText; row[16] = opts[4].scoreValue?.toString() || '' }
    rows.push(row)
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

      const row = new Array(headers.length).fill('')
      row[0] = 'NEW'
      row[1] = briCategory
      row[2] = subCategory
      row[3] = String(globalQuestionNum)
      row[4] = questionText
      // Options - scores left blank for user to fill
      if (options[0]) { row[7] = options[0] }
      if (options[1]) { row[9] = options[1] }
      if (options[2]) { row[11] = options[2] }
      if (options[3]) { row[13] = options[3] }
      if (options[4]) { row[15] = options[4] }

      rows.push(row)
      continue
    }
    i++
  }

  // Create reference sheet for canonical verbs
  const verbReference = `
CANONICAL VERBS REFERENCE
=========================

TIER 1 - CORE (Do these first)
------------------------------
DOCUMENT    - Capture and memorialize information, processes, assets, or evidence
FORMALIZE   - Convert informal practices into enforceable structure (policies, agreements)
VALIDATE    - Prove accuracy, performance, or compliance (often with third-party verification)
REMEDIATE   - Fix or cure an identified deficiency or breach
STABILIZE   - Reduce volatility, inconsistency, or fragility; increase predictability
PROTECT     - Reduce exposure with controls, safeguards, insurance, or security measures
ALIGN       - Ensure people, incentives, and agreements support continuity
SIMPLIFY    - Reduce unnecessary complexity (entities, SKUs, vendors, process noise)

TIER 2 - STRUCTURAL (Bigger changes)
------------------------------------
SEGREGATE   - Isolate assets, liabilities, or duties; ring-fence risk
RESTRUCTURE - Change legal, organizational, or operational architecture
CENTRALIZE  - Consolidate ownership, control, reporting, or systems
DELEGATE    - Transfer authority away from founder dependency

TIER 3 - TEMPORAL (Time-sequenced)
----------------------------------
PRIORITIZE  - Rank risks/actions by urgency and value impact
PHASE       - Sequence work into stages with milestones and gates
PILOT       - Test a solution on smaller scope before full rollout
TRANSITION  - Shift responsibility/control over time; execute handoffs

TIER 4 - RISK ACCEPTANCE (When you CAN'T fix)
---------------------------------------------
DEFER       - Intentionally delay with rationale (REQUIRES companion verb)
DISCLOSE    - Proactively surface unresolved risk with facts and status
FRAME       - Contextualize risk with evidence, controls, and narrative
COMMIT      - Make a time-bound plan with owners and milestones

DEFER REASON CODES
------------------
TIME_CONSTRAINT           - Not enough time before exit
CAPITAL_CONSTRAINT        - Would cost too much to fix
DISPROPORTIONATE_ROI      - Fix costs more than value gained
BUYER_PLATFORM_DEPENDENCY - Buyer will handle post-close
NON_CORE                  - Not material to this transaction

OWNER ROLES
-----------
FOUNDER, CFO_FINANCE, OPS_LEADER, SALES_MKTG, HR_PEOPLE, LEGAL_COMPLIANCE, IT_SECURITY, ADVISOR

TIMEBOX
-------
IMMEDIATE_0_30  - Complete within 30 days
NEAR_30_90      - Complete within 90 days
LONG_90_365     - Complete within 1 year

TASK FORMAT: <Verb> <Object> to <Outcome>
Example: "Formalize sales discount approval policy to prevent margin leakage and inconsistent pricing"
`

  // Write main CSV
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n')

  const outputPath = '/Users/bradfeldman/Documents/Exit-OSx_v2/Task Engine/Question_Strategy_Template_v3.csv'
  fs.writeFileSync(outputPath, csvContent)

  // Write verb reference
  const refPath = '/Users/bradfeldman/Documents/Exit-OSx_v2/Task Engine/Canonical_Verbs_Reference.txt'
  fs.writeFileSync(refPath, verbReference.trim())

  console.log(`\nSpreadsheet created: ${outputPath}`)
  console.log(`Verb reference created: ${refPath}`)
  console.log(`- Existing questions: ${existingQuestions.length}`)
  console.log(`- New questions: ${rows.length - existingQuestions.length}`)
  console.log(`- Total: ${rows.length}`)
  console.log(`- Columns: ${headers.length}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(console.error)
