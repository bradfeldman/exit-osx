import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Use .env.production if --prod flag is passed, otherwise .env.local
const envFile = process.argv.includes('--prod') ? '.env.production' : '.env.local'
config({ path: envFile })
console.log(`Using env file: ${envFile}`)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function listUsers() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data: users, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error listing users:', error.message)
    process.exit(1)
  }

  console.log(`Found ${users?.users?.length || 0} users:\n`)

  users?.users?.forEach(u => {
    console.log(`- ${u.email} (ID: ${u.id})`)
  })
}

listUsers().catch(console.error)
