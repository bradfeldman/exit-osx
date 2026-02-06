import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DriftReportPage } from '@/components/drift-report/DriftReportPage'

export default async function DriftReportPageRoute() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <DriftReportPage />
}
