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

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true
      }
    })
    console.log(`Found ${users.length} users in database:\n`)
    users.forEach(u => {
      console.log(`- ${u.email} ${u.isSuperAdmin ? '(Super Admin)' : ''}`)
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()
