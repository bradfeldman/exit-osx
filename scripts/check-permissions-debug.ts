import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { ROLE_TEMPLATES, GranularPermission } from '../src/lib/auth/permissions'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // Simulate what resolveUserPermissions does
    const orgUser = await prisma.organizationUser.findFirst({
      where: {
        user: {
          email: 'bradfeldman22@gmail.com'
        }
      },
      include: {
        roleTemplate: true,
        customPermissions: true,
      },
    })

    if (!orgUser) {
      console.log('Organization user not found')
      return
    }

    console.log('\n=== Debug Permission Resolution ===\n')
    console.log(`roleTemplate exists: ${!!orgUser.roleTemplate}`)
    console.log(`roleTemplateId: ${orgUser.roleTemplateId}`)
    console.log(`roleTemplateId === null: ${orgUser.roleTemplateId === null}`)
    console.log(`role: ${orgUser.role}`)
    console.log(`role is ADMIN or SUPER_ADMIN: ${orgUser.role === 'SUPER_ADMIN' || orgUser.role === 'ADMIN'}`)

    // Simulate permission resolution
    let permissions: Record<GranularPermission, boolean> = {} as Record<GranularPermission, boolean>

    if (orgUser.roleTemplate) {
      console.log('\n>>> Using database roleTemplate permissions')
      const templateDefaults = orgUser.roleTemplate.defaultPermissions as Record<string, boolean>
      permissions = { ...templateDefaults } as Record<GranularPermission, boolean>
    } else if (orgUser.roleTemplateId === null) {
      console.log('\n>>> roleTemplateId is null, checking role...')
      if (orgUser.role === 'SUPER_ADMIN' || orgUser.role === 'ADMIN') {
        console.log('>>> Using code-based owner template (ADMIN fallback)')
        const ownerTemplate = ROLE_TEMPLATES.owner
        permissions = { ...ownerTemplate.defaultPermissions }
      } else {
        console.log('>>> Role is not ADMIN/SUPER_ADMIN, no fallback')
      }
    } else {
      console.log(`\n>>> roleTemplateId is NOT null: ${orgUser.roleTemplateId}`)
    }

    // Check personal permissions
    console.log('\n=== Resolved Personal Permissions ===')
    console.log(`personal.retirement:view = ${permissions['personal.retirement:view']}`)
    console.log(`personal.net_worth:view = ${permissions['personal.net_worth:view']}`)

    // Verify code-based owner template
    console.log('\n=== Code-based ROLE_TEMPLATES.owner ===')
    console.log(`personal.retirement:view = ${ROLE_TEMPLATES.owner.defaultPermissions['personal.retirement:view']}`)
    console.log(`personal.net_worth:view = ${ROLE_TEMPLATES.owner.defaultPermissions['personal.net_worth:view']}`)

  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch(console.error)
