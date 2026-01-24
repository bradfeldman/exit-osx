import 'dotenv/config'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Load from .env.local first
config({ path: '.env.local' })

// Use DIRECT_URL for direct database access (same as prisma.config.ts)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
console.log('Connecting to database...')
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function setSuperAdmin() {
  const email = process.argv[2] || 'brad@bradfeldman.com'

  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isSuperAdmin: true }
    })
    console.log(`✓ Updated user: ${user.email} - isSuperAdmin: ${user.isSuperAdmin}`)
  } catch (error) {
    if ((error as Error).message?.includes('Record to update not found')) {
      console.error(`✗ User with email "${email}" not found in database`)
    } else {
      console.error('Error:', error)
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

setSuperAdmin()
