import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingSettings } from '@/components/settings/BillingSettings'
import { Loader2 } from 'lucide-react'

function BillingSettingsLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default async function BillingSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription plan and billing</p>
      </div>
      <Suspense fallback={<BillingSettingsLoading />}>
        <BillingSettings />
      </Suspense>
    </div>
  )
}
