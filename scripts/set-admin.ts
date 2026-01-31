import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'

// Use DIRECT_URL for scripts (bypasses Prisma Accelerate)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
})

async function setSuperAdmin() {
  const email = process.argv[2]

  if (!email) {
    console.error('Usage: npx tsx scripts/set-admin.ts <email>')
    process.exit(1)
  }

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
  }
}

setSuperAdmin()
