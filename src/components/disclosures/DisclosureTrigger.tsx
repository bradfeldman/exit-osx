'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DisclosurePrompt } from './DisclosurePrompt'

interface PromptSetData {
  id: string
  questions: Array<{
    key: string
    text: string
    briCategory: string
    followUpText: string
    signalType: string
  }>
  responses: Array<{
    questionKey: string
    answer: boolean
    followUpAnswer: string | null
  }>
}

export function DisclosureTrigger() {
  const { selectedCompanyId } = useCompany()
  const [promptSet, setPromptSet] = useState<PromptSetData | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/companies/${selectedCompanyId}/disclosures/current`
      )
      if (!response.ok) throw new Error('Failed to fetch')
      const json = await response.json()
      setPromptSet(json.promptSet)
    } catch {
      setPromptSet(null)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (isLoading || !promptSet) return null

  // Calculate remaining questions
  const answeredKeys = new Set(promptSet.responses.map((r) => r.questionKey))
  const remaining = promptSet.questions.filter((q) => !answeredKeys.has(q.key))
  if (remaining.length === 0) return null

  return (
    <>
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="rounded-xl bg-blue-100 p-2.5">
              <MessageCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-800">
              Monthly Check-in
            </h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              {remaining.length} quick question{remaining.length !== 1 ? 's' : ''} about changes in your business
            </p>
          </div>
          <Button
            onClick={() => setShowPrompt(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Start Check-in
          </Button>
        </div>
      </div>

      {showPrompt && (
        <DisclosurePrompt
          promptSet={promptSet}
          onClose={() => setShowPrompt(false)}
          onComplete={() => {
            setShowPrompt(false)
            setPromptSet(null)
          }}
        />
      )}
    </>
  )
}
