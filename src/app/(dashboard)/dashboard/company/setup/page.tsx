import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompanySetupWizard } from '@/components/company/CompanySetupWizard'

export default async function CompanySetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <CompanySetupWizard />
    </div>
  )
}
