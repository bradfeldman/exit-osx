import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrganizationSettings } from '@/components/settings/OrganizationSettings'

export default async function OrganizationSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Team Settings</h1>
        <p className="text-muted-foreground">Manage your organization members and invites</p>
      </div>
      <OrganizationSettings />
    </div>
  )
}
