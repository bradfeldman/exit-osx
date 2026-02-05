import { createClient } from '@/lib/supabase/server'
import { DiagnosisPage } from '@/components/diagnosis/DiagnosisPage'

export default async function DiagnosisRoute() {
  const supabase = await createClient()
  await supabase.auth.getUser()

  return <DiagnosisPage />
}
