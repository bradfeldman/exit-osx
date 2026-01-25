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
    // Get all organization users with their role info
    const orgUsers = await prisma.organizationUser.findMany({
      include: {
        user: {
          select: { email: true, name: true }
        },
        roleTemplate: {
          select: { slug: true, name: true, defaultPermissions: true }
        },
        organization: {
          select: { name: true }
        }
      }
    })

    console.log('\n=== Organization Users ===\n')
    for (const ou of orgUsers) {
      console.log(`User: ${ou.user.email} (${ou.user.name || 'No name'})`)
      console.log(`  Organization: ${ou.organization.name}`)
      console.log(`  Role: ${ou.role}`)
      console.log(`  Role Template: ${ou.roleTemplate?.name || 'NONE ASSIGNED'}`)
      console.log(`  Role Template Slug: ${ou.roleTemplate?.slug || 'null'}`)
      console.log(`  Is External Advisor: ${ou.isExternalAdvisor}`)

      // Check personal permissions if template exists
      if (ou.roleTemplate?.defaultPermissions) {
        const perms = ou.roleTemplate.defaultPermissions as Record<string, boolean>
        console.log(`  Personal Permissions:`)
        console.log(`    - personal.retirement:view = ${perms['personal.retirement:view'] ?? 'undefined'}`)
        console.log(`    - personal.net_worth:view = ${perms['personal.net_worth:view'] ?? 'undefined'}`)
      }
      console.log('')
    }

    // Also get role templates
    const templates = await prisma.roleTemplate.findMany()
    console.log('\n=== Role Templates ===\n')
    for (const t of templates) {
      const perms = t.defaultPermissions as Record<string, boolean>
      console.log(`${t.name} (${t.slug}):`)
      console.log(`  personal.retirement:view = ${perms['personal.retirement:view'] ?? 'undefined'}`)
      console.log(`  personal.net_worth:view = ${perms['personal.net_worth:view'] ?? 'undefined'}`)
    }
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch(console.error)
