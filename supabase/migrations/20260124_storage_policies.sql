-- Storage RLS policies for data-room bucket
-- Run this in Supabase Dashboard > SQL Editor

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
