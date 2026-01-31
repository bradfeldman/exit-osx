import { config } from 'dotenv'
config({ path: '.env.production' })

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
})

async function setSuperAdmin() {
  const email = "bfeldman@pasadena-private.com"

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
