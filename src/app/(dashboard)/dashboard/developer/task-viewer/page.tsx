'use client'

import { TaskViewer } from '@/components/developer/TaskViewer'
import { useRouter } from 'next/navigation'

export default function TaskViewerPage() {
  const router = useRouter()

  return <TaskViewer onBack={() => router.push('/dashboard')} />
}
