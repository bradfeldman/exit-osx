/**
 * Script to create the data-room storage bucket in Supabase
 * Run with: npx tsx scripts/create-storage-bucket.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables:')
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseServiceKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nMake sure these are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createBucket() {
  console.log('Creating data-room storage bucket...\n')

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('Error listing buckets:', listError.message)
    process.exit(1)
  }

  const existingBucket = buckets?.find((b) => b.name === 'data-room')

  if (existingBucket) {
    console.log('✓ Bucket "data-room" already exists')
    console.log('  Public:', existingBucket.public)
    console.log('  Created:', existingBucket.created_at)
    return
  }

  // Create the bucket (private)
  const { data, error } = await supabase.storage.createBucket('data-room', {
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-zip-compressed',
    ],
  })

  if (error) {
    console.error('Error creating bucket:', error.message)
    process.exit(1)
  }

  console.log('✓ Created private bucket "data-room"')
  console.log('  - 50MB file size limit')
  console.log('  - Allowed: PDF, Word, Excel, PowerPoint, images, text, CSV, ZIP')
  console.log('\nNow creating RLS policies...\n')

  // Note: RLS policies need to be created via SQL
  // The Supabase JS client doesn't support creating storage policies directly
  console.log('To complete setup, run this SQL in Supabase Dashboard > SQL Editor:\n')
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

  console.log('\n✓ Bucket created successfully!')
  console.log('  Remember to run the SQL above to enable file access.')
}

createBucket().catch(console.error)
