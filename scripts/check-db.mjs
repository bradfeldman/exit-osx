// Direct database query without Prisma
import pg from 'pg'
import { config } from 'dotenv'

// Load .env.local
config({ path: '.env.local' })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

async function check() {
  try {
    // Check project questions
    const projectResult = await pool.query('SELECT COUNT(*) as count FROM project_questions')
    console.log('Project Questions:', projectResult.rows[0].count)

    // Check initial questions
    const initialResult = await pool.query('SELECT COUNT(*) as count FROM questions')
    console.log('Initial Questions:', initialResult.rows[0].count)

    // Sample project questions if any exist
    if (parseInt(projectResult.rows[0].count) > 0) {
      const sample = await pool.query('SELECT module_id, bri_category, question_text FROM project_questions LIMIT 3')
      console.log('Sample:', sample.rows)
    }

    // Check company question priorities
    const priorityResult = await pool.query(`
      SELECT c.name,
             COUNT(cqp.id) as total,
             SUM(CASE WHEN cqp.has_been_asked THEN 1 ELSE 0 END) as asked
      FROM companies c
      LEFT JOIN company_question_priorities cqp ON c.id = cqp.company_id
      GROUP BY c.id, c.name
      ORDER BY c.created_at DESC
      LIMIT 3
    `)
    console.log('Recent companies and their question status:', priorityResult.rows)

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

check()
