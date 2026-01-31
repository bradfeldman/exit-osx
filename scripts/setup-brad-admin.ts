import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.production' })

import { PrismaClient } from '@prisma/client'

const supabaseUrl = "https://tkzoygqdcvkrwmhzpttl.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrem95Z3FkY3ZrcndtaHpwdHRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2OTU5OCwiZXhwIjoyMDgzODQ1NTk4fQ.fWG0LdwTAdpbMU-fHlbPyHqQatdJW2U1iEikS7sUOPM"

const TARGET_EMAIL = "brad@bradfeldman.com"
const NEW_PASSWORD = "PasadenaPrivat3"

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
})

async function setup() {
  // 1. Reset password in Supabase Auth
  console.log(`\n1. Resetting password for: ${TARGET_EMAIL}`)

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Error listing users:', listError.message)
    return
  }

  const user = users?.users?.find(u => u.email === TARGET_EMAIL)
  if (!user) {
    console.error(`User "${TARGET_EMAIL}" not found in Supabase Auth`)
    return
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: NEW_PASSWORD }
  )

  if (updateError) {
    console.error('Error updating password:', updateError.message)
    return
  }
  console.log('✓ Password reset successfully!')

  // 2. Set super admin in database
  console.log(`\n2. Setting super admin flag for: ${TARGET_EMAIL}`)

  try {
    const dbUser = await prisma.user.update({
      where: { email: TARGET_EMAIL },
      data: { isSuperAdmin: true }
    })
    console.log(`✓ Updated user: ${dbUser.email} - isSuperAdmin: ${dbUser.isSuperAdmin}`)
  } catch (error) {
    console.error('Error setting super admin:', error)
  } finally {
    await prisma.$disconnect()
  }

  console.log(`\n✅ Done! Login with:`)
  console.log(`   Email: ${TARGET_EMAIL}`)
  console.log(`   Password: ${NEW_PASSWORD}`)
}

setup()
