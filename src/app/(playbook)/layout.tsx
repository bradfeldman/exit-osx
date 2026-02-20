import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlaybookShell } from './PlaybookShell'

export default async function PlaybookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <PlaybookShell user={user}>{children}</PlaybookShell>
}
