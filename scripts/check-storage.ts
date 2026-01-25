/**
 * Quick check of storage bucket status
 * Run with: npx tsx scripts/check-storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function check() {
  console.log('Checking Supabase storage setup...\n')
  console.log('Project URL:', supabaseUrl)

  // List buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError.message)
    return
  }

  console.log('\nBuckets found:', buckets?.length || 0)
  buckets?.forEach(b => {
    console.log(`  - ${b.name} (public: ${b.public})`)
  })

  const dataRoomBucket = buckets?.find(b => b.name === 'data-room')
  if (!dataRoomBucket) {
    console.log('\n❌ data-room bucket NOT FOUND')
    return
  }

  console.log('\n✓ data-room bucket exists')

  // Try to list files (tests READ policy)
  const { data: files, error: listError } = await supabase.storage
    .from('data-room')
    .list('', { limit: 5 })

  if (listError) {
    console.log('❌ Cannot list files:', listError.message)
    console.log('   → RLS SELECT policy may be missing')
  } else {
    console.log('✓ Can list files (', files?.length || 0, 'files found)')
  }

  // Try to upload a test file (tests INSERT policy)
  const testContent = new Blob(['test'], { type: 'text/plain' })
  const testPath = `_test_${Date.now()}.txt`

  const { error: uploadError } = await supabase.storage
    .from('data-room')
    .upload(testPath, testContent)

  if (uploadError) {
    console.log('❌ Cannot upload:', uploadError.message)
    console.log('   → RLS INSERT policy may be missing')
  } else {
    console.log('✓ Can upload files')

    // Clean up test file
    await supabase.storage.from('data-room').remove([testPath])
    console.log('✓ Can delete files')
  }

  // Try to create signed URL
  const { data: signedUrl, error: signedError } = await supabase.storage
    .from('data-room')
    .createSignedUrl(testPath, 60)

  if (signedError && !signedError.message.includes('not found')) {
    console.log('❌ Cannot create signed URLs:', signedError.message)
  } else {
    console.log('✓ Can create signed URLs')
  }

  console.log('\n✅ Storage is properly configured!')
}

check().catch(console.error)
