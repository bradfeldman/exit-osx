import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TEST_EMAIL = 'test@exitosx.com'
const TEST_PASSWORD = 'TestPassword123!'

async function createTestUser() {
  console.log('Creating test user...')
  console.log(`Email: ${TEST_EMAIL}`)
  console.log(`Password: ${TEST_PASSWORD}`)
  console.log('')

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === TEST_EMAIL)

  if (existingUser) {
    console.log('Test user already exists!')
    console.log(`User ID: ${existingUser.id}`)

    // Update password to ensure we know it
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: TEST_PASSWORD }
    )

    if (updateError) {
      console.error('Error updating password:', updateError.message)
    } else {
      console.log('Password updated successfully.')
    }
    return
  }

  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true, // Auto-confirm email
  })

  if (error) {
    console.error('Error creating user:', error.message)
    return
  }

  console.log('Test user created successfully!')
  console.log(`User ID: ${data.user.id}`)
  console.log('')
  console.log('Now create the e2e/.env file:')
  console.log(`TEST_USER_EMAIL=${TEST_EMAIL}`)
  console.log(`TEST_USER_PASSWORD=${TEST_PASSWORD}`)
}

createTestUser().catch(console.error)
