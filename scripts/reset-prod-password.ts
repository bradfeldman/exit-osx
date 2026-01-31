import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://tkzoygqdcvkrwmhzpttl.supabase.co"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrem95Z3FkY3ZrcndtaHpwdHRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2OTU5OCwiZXhwIjoyMDgzODQ1NTk4fQ.fWG0LdwTAdpbMU-fHlbPyHqQatdJW2U1iEikS7sUOPM"

const TARGET_EMAIL = "bfeldman@pasadena-private.com"
const NEW_PASSWORD = "PasadenaPrivat3"

async function resetPassword() {
  console.log(`Resetting password for: ${TARGET_EMAIL}`)

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
    console.error(`User "${TARGET_EMAIL}" not found`)
    return
  }

  console.log(`Found user: ${user.id}`)

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: NEW_PASSWORD }
  )

  if (updateError) {
    console.error('Error updating password:', updateError.message)
    return
  }

  console.log('✓ Password reset successfully!')
}

resetPassword()
