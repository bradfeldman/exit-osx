'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface IndustryMatch {
  icbIndustry: string
  icbSuperSector: string
  icbSector: string
  icbSubSector: string
  industryLabel: string
  superSectorLabel: string
  sectorLabel: string
  subSectorLabel: string
  confidence: string
  reasoning: string
}

interface IndustryFinderDialogProps {
  onSelect: (selection: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }) => void
}

export function IndustryFinderDialog({ onSelect }: IndustryFinderDialogProps) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<IndustryMatch | null>(null)

  const handleSubmit = async () => {
    if (!description.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/industries/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to find industry match')
      }

      const data = await response.json()
      setResult(data.match)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleUseResult = () => {
    if (result) {
      onSelect({
        icbIndustry: result.icbIndustry,
        icbSuperSector: result.icbSuperSector,
        icbSector: result.icbSector,
        icbSubSector: result.icbSubSector,
      })
      setOpen(false)
      setDescription('')
      setResult(null)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setDescription('')
    setResult(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose()
      else setOpen(true)
    }}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-primary hover:text-primary/80 hover:underline focus:outline-none"
        >
          Not sure which classification? Describe your business
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Find Your Industry Classification</DialogTitle>
          <DialogDescription>
            Describe what your business does in a few words, and we&apos;ll suggest the best industry classification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Input */}
          {!result && (
            <>
              <div>
                <label htmlFor="business-description" className="block text-sm font-medium text-foreground mb-2">
                  What does your business do?
                </label>
                <textarea
                  id="business-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., We manufacture and sell a mouthguard to help people stop bruxing (teeth grinding)"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Be specific about your products, services, and target customers.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !description.trim()}
                  className="bg-[#B87333] hover:bg-[#9A5F2A]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Finding...
                    </>
                  ) : (
                    'Find Classification'
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900">Recommended Classification</p>
                    <p className="text-lg font-semibold text-green-800 mt-1">{result.subSectorLabel}</p>
                    <p className="text-xs text-green-700 mt-1">
                      {result.industryLabel} &rarr; {result.superSectorLabel} &rarr; {result.sectorLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Why this classification:</span> {result.reasoning}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResult(null)
                    setDescription('')
                  }}
                >
                  Try Different Description
                </Button>
                <Button
                  type="button"
                  onClick={handleUseResult}
                  className="bg-[#B87333] hover:bg-[#9A5F2A]"
                >
                  Use This Classification
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
