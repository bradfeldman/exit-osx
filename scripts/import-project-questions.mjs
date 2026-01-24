// Import project questions from CSV into database
import pg from 'pg'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

// Load .env.local
config({ path: '.env.local' })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

// Map CSV category names to BriCategory enum values
const categoryMap = {
  'Financial': 'FINANCIAL',
  'Transferability': 'TRANSFERABILITY',
  'Operational': 'OPERATIONAL',
  'Market': 'MARKET',
  'Legal & Tax': 'LEGAL_TAX',
  'Personal Readiness': 'PERSONAL',
}

// Map risk level to QuestionImpact enum
const riskLevelToImpact = {
  'Critical': 'CRITICAL',
  'High': 'HIGH',
  'Potential': 'MEDIUM',
  'Medium': 'MEDIUM',
  'Low': 'LOW',
}

// Generate a cuid-like ID
function generateId() {
  return 'cuid_' + randomUUID().replace(/-/g, '').substring(0, 24)
}

// Simple CSV parser that handles commas within fields
function parseCSV(csvContent) {
  const lines = csvContent.split('\n')
  const headers = parseCSVLine(lines[0])
  const records = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const record = {}
    headers.forEach((header, idx) => {
      record[header] = values[idx] || ''
    })
    records.push(record)
  }

  return records
}

// Parse a single CSV line, handling quoted fields with commas
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result
}

async function importQuestions() {
  const client = await pool.connect()

  try {
    // Read and parse CSV
    const csvPath = '/Users/bradfeldman/Documents/Exit-OSx_v2/Task Engine/Question and Task List and Weights/risk-assessment-master.csv'
    const csvContent = readFileSync(csvPath, 'utf-8')
    const records = parseCSV(csvContent)

    console.log(`Parsed ${records.length} rows from CSV`)

    // Group rows by question ID to get unique questions
    const questionsMap = new Map()

    for (const row of records) {
      const questionId = row.Question_ID
      if (!questionId) continue

      if (!questionsMap.has(questionId)) {
        questionsMap.set(questionId, {
          questionId,
          questionText: row.Question,
          category: row.Category,
          subCategory: row.Sub_Category,
          subCategoryRiskLevel: row.Sub_Category_Risk_Level,
          categoryWeight: row.Category_Weight,
          subCategoryWeight: row.Sub_Category_Weight,
          questionWeight: row.Question_Weight,
          assessmentType: row.Assessment_Type,
          options: [],
        })
      }

      // Add option to question
      const question = questionsMap.get(questionId)
      question.options.push({
        answerId: row.Answer_ID,
        answerText: row.Answer_Text,
        answerRiskLevel: row.Answer_Risk_Level,
        answerScore: parseFloat(row.Answer_Score) || 0,
        taskCode: row.Task_Code,
        taskTitle: row.Task_Title,
        taskDescription: row.Task_Description,
        taskAcceptanceCriteria: row.Task_Acceptance_Criteria,
        taskTime: row.Task_Time,
        taskEffort: row.Task_Effort,
        buyerLogic: row.Buyer_Logic,
      })
    }

    console.log(`Found ${questionsMap.size} unique questions`)

    // Begin transaction
    await client.query('BEGIN')

    // Clear existing data (in reverse order of dependencies)
    console.log('Clearing existing project question data...')
    await client.query('DELETE FROM project_task_templates')
    await client.query('DELETE FROM project_strategies')
    await client.query('DELETE FROM project_assessment_responses')
    await client.query('DELETE FROM project_assessment_questions')
    await client.query('DELETE FROM company_question_priorities')
    await client.query('DELETE FROM project_question_options')
    await client.query('DELETE FROM project_questions')

    let questionCount = 0
    let optionCount = 0

    for (const [qId, question] of questionsMap) {
      const id = generateId()
      const briCategory = categoryMap[question.category]

      if (!briCategory) {
        console.warn(`Unknown category: ${question.category} for question ${qId}`)
        continue
      }

      // Map sub-category risk level to impact
      const questionImpact = riskLevelToImpact[question.subCategoryRiskLevel] || 'MEDIUM'

      // Create module ID from question ID (e.g., FIN_CC_01 -> MOD-FIN-CC-01)
      const moduleId = 'MOD-' + qId.replace(/_/g, '-')

      // Insert question
      await client.query(
        `INSERT INTO project_questions (
          id, module_id, question_id, question_text, bri_category, sub_category,
          question_impact, buyer_sensitivity, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          id,
          moduleId,
          qId,
          question.questionText,
          briCategory,
          question.subCategory,
          questionImpact,
          questionImpact, // Use same value for buyer_sensitivity initially
          true,
        ]
      )
      questionCount++

      // Insert options
      // Sort options by score to determine display order (A=lowest, D=highest usually)
      const sortedOptions = question.options.sort((a, b) => a.answerScore - b.answerScore)

      const optionLetters = ['A', 'B', 'C', 'D', 'E']
      for (let i = 0; i < sortedOptions.length; i++) {
        const opt = sortedOptions[i]
        const optionId = generateId()
        const optionLetter = optionLetters[i] || String.fromCharCode(65 + i)

        await client.query(
          `INSERT INTO project_question_options (
            id, question_id, option_id, option_text, score_value,
            buyer_interpretation, display_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            optionId,
            id, // Reference to project_questions.id
            optionLetter,
            opt.answerText,
            opt.answerScore,
            opt.buyerLogic || null,
            i + 1,
          ]
        )
        optionCount++
      }
    }

    // Commit transaction
    await client.query('COMMIT')

    console.log(`\nImport complete!`)
    console.log(`- Questions imported: ${questionCount}`)
    console.log(`- Options imported: ${optionCount}`)

    // Verify counts
    const verifyQuestions = await client.query('SELECT COUNT(*) as count FROM project_questions')
    const verifyOptions = await client.query('SELECT COUNT(*) as count FROM project_question_options')

    console.log(`\nVerification:`)
    console.log(`- project_questions table: ${verifyQuestions.rows[0].count} rows`)
    console.log(`- project_question_options table: ${verifyOptions.rows[0].count} rows`)

    // Show category breakdown
    const categoryBreakdown = await client.query(`
      SELECT bri_category, COUNT(*) as count
      FROM project_questions
      GROUP BY bri_category
      ORDER BY bri_category
    `)
    console.log(`\nQuestions by category:`)
    for (const row of categoryBreakdown.rows) {
      console.log(`  ${row.bri_category}: ${row.count}`)
    }

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Import failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

importQuestions().catch(console.error)
