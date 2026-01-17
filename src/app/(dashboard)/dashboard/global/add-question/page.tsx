'use client'

import { AddQuestionFlow } from '@/components/developer/AddQuestionFlow'
import { useRouter } from 'next/navigation'

export default function AddQuestionPage() {
  const router = useRouter()

  return <AddQuestionFlow onBack={() => router.push('/dashboard')} />
}
