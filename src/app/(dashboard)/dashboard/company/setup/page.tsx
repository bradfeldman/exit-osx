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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Set Up Your Company</h1>
        <p className="text-gray-600 mt-1">
          Tell us about your business so we can calculate your valuation and buyer readiness score.
        </p>
      </div>
      <CompanySetupWizard />
    </div>
  )
}
