import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has companies - redirect to onboarding if not
  const { count } = await supabase
    .from('companies')
    .select('id', { count: 'exact', head: true })

  if (!count || count === 0) {
    redirect('/onboarding')
  }

  return <DashboardShell user={user}>{children}</DashboardShell>
}
