import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // Find the owner role template
    const ownerTemplate = await prisma.roleTemplate.findFirst({
      where: { slug: 'owner' }
    })

    if (!ownerTemplate) {
      console.log('Owner role template not found! Run db:seed first.')
      return
    }

    console.log(`Found owner template: ${ownerTemplate.name} (id: ${ownerTemplate.id})`)

    // Find the user's organization user record
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        user: {
          email: 'bradfeldman22@gmail.com'
        }
      },
      include: {
        user: true
      }
    })

    if (!orgUser) {
      console.log('Organization user not found!')
      return
    }

    console.log(`Found org user for: ${orgUser.user.email}`)
    console.log(`Current roleTemplateId: ${orgUser.roleTemplateId}`)

    // Update to assign owner role template
    await prisma.organizationUser.update({
      where: { id: orgUser.id },
      data: { roleTemplateId: ownerTemplate.id }
    })

    console.log(`\n✓ Successfully assigned owner role template to ${orgUser.user.email}`)
    console.log('Please refresh the page to see the changes.')

  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch(console.error)
