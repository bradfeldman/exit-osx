'use client'

import { useRouter } from 'next/navigation'
import { ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState() {
  const router = useRouter()

  return (
    <div className="max-w-[800px] mx-auto px-6 py-8">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ListChecks className="w-12 h-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground mt-4">
          Your action queue is empty
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Complete your diagnosis to generate personalized tasks that increase your business value.
        </p>
        <Button className="mt-4" onClick={() => router.push('/dashboard/diagnosis')}>
          Go to Diagnosis
        </Button>
      </div>
    </div>
  )
}
