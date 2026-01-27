import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

// Load .env.local
dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Connecting to database...')
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: 'bfeldman@pasadena-private.com' }
  })

  if (!user) {
    console.log('User not found')
    return
  }

  console.log('Found user:', user.id, user.email)

  // Find Hawaii Pacific company and its organization
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Hawaii Pacific' } }
  })

  if (!company) {
    console.log('Company not found')
    return
  }

  console.log('Found company:', company.id, company.name, '- Organization:', company.organizationId)

  // Find role template for wealth_advisor
  let roleTemplate = await prisma.roleTemplate.findFirst({
    where: { slug: 'wealth_advisor' }
  })

  if (!roleTemplate) {
    console.log('wealth_advisor role template not found, checking available templates...')
    const templates = await prisma.roleTemplate.findMany()
    console.log('Available templates:', templates.map(t => ({ id: t.id, slug: t.slug })))

    // Try owner instead
    roleTemplate = await prisma.roleTemplate.findFirst({
      where: { slug: 'owner' }
    })

    if (!roleTemplate) {
      console.log('No suitable role template found')
      return
    }
  }

  console.log('Using role template:', roleTemplate.id, roleTemplate.slug)

  // Find the OrganizationUser record for this user in this organization
  const orgUser = await prisma.organizationUser.findFirst({
    where: {
      userId: user.id,
      organizationId: company.organizationId
    }
  })

  if (!orgUser) {
    console.log('User is not a member of this organization')
    return
  }

  console.log('Found OrganizationUser:', orgUser.id, 'current role template:', orgUser.roleTemplateId)

  // Update the organization user's role template
  const updated = await prisma.organizationUser.update({
    where: { id: orgUser.id },
    data: {
      roleTemplateId: roleTemplate.id
    }
  })

  console.log('Updated OrganizationUser - new roleTemplateId:', updated.roleTemplateId)

  // Verify
  const verifyOrgUser = await prisma.organizationUser.findUnique({
    where: { id: orgUser.id },
    include: {
      roleTemplate: true
    }
  })

  console.log('Verified new role:', verifyOrgUser?.roleTemplate?.slug)
  console.log('')
  console.log('Done! Refresh the page and you should now have access to Personal Financial Statement.')
}

main()
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect()
    pool.end()
  })
