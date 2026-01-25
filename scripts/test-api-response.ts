import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { ROLE_TEMPLATES, GRANULAR_PERMISSIONS, GranularPermission } from '../src/lib/auth/permissions'

// Load environment variables from .env.local
config({ path: '.env.local' })

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // Simulate the full API response flow
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

    // Simulate resolveUserPermissions
    let permissions: Record<GranularPermission, boolean> = {} as Record<GranularPermission, boolean>

    if (orgUser.roleTemplate) {
      const templateDefaults = orgUser.roleTemplate.defaultPermissions as Record<string, boolean>
      permissions = { ...templateDefaults } as Record<GranularPermission, boolean>
    } else if (orgUser.roleTemplateId === null) {
      if (orgUser.role === 'SUPER_ADMIN' || orgUser.role === 'ADMIN') {
        const ownerTemplate = ROLE_TEMPLATES.owner
        permissions = { ...ownerTemplate.defaultPermissions }
      }
    }

    // Simulate API response building (from /api/permissions/route.ts)
    const permissionList = Object.entries(GRANULAR_PERMISSIONS).map(([key, description]) => {
      const permission = key as GranularPermission
      return {
        permission,
        description,
        granted: permissions[permission] ?? false,
      }
    })

    // Check what gets returned for personal permissions
    console.log('\n=== Simulated API Response (personal permissions only) ===\n')
    const personalPerms = permissionList.filter(p => p.permission.startsWith('personal.'))
    for (const p of personalPerms) {
      console.log(`${p.permission}: granted=${p.granted}`)
    }

    // Check if the permission exists in the resolved permissions object
    console.log('\n=== Direct check of resolved permissions object ===')
    console.log(`permissions['personal.retirement:view'] = ${permissions['personal.retirement:view']}`)
    console.log(`permissions['personal.net_worth:view'] = ${permissions['personal.net_worth:view']}`)

    // Check the owner template directly
    console.log('\n=== Owner template permissions ===')
    const ownerPerms = ROLE_TEMPLATES.owner.defaultPermissions
    console.log(`Object.keys count: ${Object.keys(ownerPerms).length}`)
    console.log(`Has personal.retirement:view: ${'personal.retirement:view' in ownerPerms}`)
    console.log(`Value: ${ownerPerms['personal.retirement:view']}`)

  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch(console.error)
