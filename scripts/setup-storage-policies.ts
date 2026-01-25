/**
 * Script to set up storage RLS policies for the data-room bucket
 * Run with: npx tsx scripts/setup-storage-policies.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const policies = [
  {
    name: 'Users can upload to data-room',
    operation: 'INSERT',
    definition: "bucket_id = 'data-room'",
  },
  {
    name: 'Users can read from data-room',
    operation: 'SELECT',
    definition: "bucket_id = 'data-room'",
  },
  {
    name: 'Users can update in data-room',
    operation: 'UPDATE',
    definition: "bucket_id = 'data-room'",
  },
  {
    name: 'Users can delete from data-room',
    operation: 'DELETE',
    definition: "bucket_id = 'data-room'",
  },
]

async function setupPolicies() {
  console.log('Setting up storage RLS policies...\n')

  for (const policy of policies) {
    const sql = policy.operation === 'INSERT'
      ? `
        CREATE POLICY IF NOT EXISTS "${policy.name}"
        ON storage.objects FOR ${policy.operation}
        TO authenticated
        WITH CHECK (${policy.definition});
      `
      : `
        CREATE POLICY IF NOT EXISTS "${policy.name}"
        ON storage.objects FOR ${policy.operation}
        TO authenticated
        USING (${policy.definition});
      `

    // Use rpc to execute raw SQL (requires pg_execute permission)
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      // Try alternative approach - direct query
      console.log(`Note: ${policy.name} - may need manual creation`)
      console.log(`  SQL: ${sql.trim()}\n`)
    } else {
      console.log(`✓ Created policy: ${policy.name}`)
    }
  }

  console.log('\n---')
  console.log('If policies were not created automatically, run this SQL in Supabase Dashboard > SQL Editor:')
  console.log(`
-- Allow authenticated users to upload files
CREATE POLICY "Users can upload to data-room"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'data-room');

-- Allow authenticated users to read files
CREATE POLICY "Users can read from data-room"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'data-room');

-- Allow authenticated users to update their files
CREATE POLICY "Users can update in data-room"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'data-room');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete from data-room"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'data-room');
`)
}

setupPolicies().catch(console.error)
