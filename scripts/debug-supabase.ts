import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const envFile = process.argv.includes('--prod') ? '.env.production' : '.env.local'
config({ path: envFile })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

console.log(`Using env file: ${envFile}`)
console.log(`Supabase URL: ${supabaseUrl}`)
console.log(`Service Key length: ${supabaseServiceKey?.length}`)
console.log(`Service Key (last 20 chars): ...${supabaseServiceKey?.slice(-20)}`)

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function test() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) {
      console.error('Error:', error.message)
      console.error('Full error:', JSON.stringify(error, null, 2))
    } else {
      console.log(`Found ${data?.users?.length} users`)
    }
  } catch (e) {
    console.error('Exception:', e)
  }
}

test()
