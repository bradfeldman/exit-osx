'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListChecks, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { AssessmentPriorityCard } from './AssessmentPriorityCard'

export function EmptyState() {
  const router = useRouter()
  const { selectedCompanyId } = useCompany()
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateTasks = async () => {
    if (!selectedCompanyId) return
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/generate-ai-tasks`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to generate tasks')
      const data = await res.json()

      if (data.tasksGenerated > 0) {
        // Reload the page to show the new tasks
        window.location.reload()
      } else {
        setError('No tasks to generate. Complete your diagnosis assessment first.')
      }
    } catch {
      setError('Unable to generate tasks. Complete your diagnosis first.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-[800px] mx-auto px-6 py-8 space-y-6">
      {/* Assessment priority card — gives user a clear next step */}
      <AssessmentPriorityCard />

      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ListChecks className="w-12 h-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground mt-4">
          Your action plan is being built
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Complete your assessment to generate personalized tasks that close your value gap.
        </p>
        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/diagnosis')}>
            Go to Diagnosis
          </Button>
          {selectedCompanyId && (
            <Button onClick={handleGenerateTasks} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate Tasks
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
