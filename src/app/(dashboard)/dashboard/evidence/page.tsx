import { createClient } from '@/lib/supabase/server'
import { EvidencePage } from '@/components/evidence/EvidencePage'

export default async function EvidenceRoute() {
  const supabase = await createClient()
  await supabase.auth.getUser()

  return <EvidencePage />
}
