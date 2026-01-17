'use client'

import { AddTaskFlow } from '@/components/developer/AddTaskFlow'
import { useRouter } from 'next/navigation'

export default function AddTaskPage() {
  const router = useRouter()

  return <AddTaskFlow onBack={() => router.push('/dashboard')} />
}
