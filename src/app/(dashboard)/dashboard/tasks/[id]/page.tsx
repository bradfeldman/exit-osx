import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TaskExecutionClient } from './TaskExecutionClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TaskPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { id } = await params

  return <TaskExecutionClient taskId={id} />
}
