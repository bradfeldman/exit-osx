import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Use .env.production if --prod flag is passed, otherwise .env.local
const envFile = process.argv.includes('--prod') ? '.env.production' : '.env.local'
config({ path: envFile })
console.log(`Using env file: ${envFile}`)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TARGET_EMAIL = process.argv[2] || 'brad@bradfeldman.com'
const NEW_PASSWORD = process.argv[3]

async function resetPassword() {
  if (!NEW_PASSWORD) {
    console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>')
    process.exit(1)
  }

  console.log(`Resetting password for: ${TARGET_EMAIL}`)

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Find user by email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('Error listing users:', listError.message)
    process.exit(1)
  }

  const user = users?.users?.find(u => u.email === TARGET_EMAIL)

  if (!user) {
    console.error(`User with email "${TARGET_EMAIL}" not found`)
    process.exit(1)
  }

  console.log(`Found user: ${user.id}`)

  // Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: NEW_PASSWORD }
  )

  if (updateError) {
    console.error('Error updating password:', updateError.message)
    process.exit(1)
  }

  console.log('✓ Password reset successfully!')
}

resetPassword().catch(console.error)
