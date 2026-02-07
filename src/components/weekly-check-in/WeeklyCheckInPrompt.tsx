'use client'

import { useState } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { X, ChevronRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface WeeklyCheckInPromptProps {
  checkInId: string
  onClose: () => void
  onComplete: () => void
}

type Step = 1 | 2 | 3 | 4 | 5

export function WeeklyCheckInPrompt({ checkInId, onClose, onComplete }: WeeklyCheckInPromptProps) {
  const { selectedCompanyId } = useCompany()
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Answers
  const [taskStatus, setTaskStatus] = useState<string | null>(null)
  const [teamChanges, setTeamChanges] = useState<boolean | null>(null)
  const [teamChangesNote, setTeamChangesNote] = useState('')
  const [customerChanges, setCustomerChanges] = useState<boolean | null>(null)
  const [customerChangesNote, setCustomerChangesNote] = useState('')
  const [confidenceRating, setConfidenceRating] = useState<number | null>(null)
  const [additionalNotes, setAdditionalNotes] = useState('')

  const canAdvance = (() => {
    switch (step) {
      case 1: return taskStatus !== null
      case 2: return teamChanges !== null
      case 3: return customerChanges !== null
      case 4: return confidenceRating !== null
      case 5: return true // optional
    }
  })()

  const handleNext = async () => {
    if (step < 5) {
      setStep((step + 1) as Step)
      return
    }

    // Submit
    setSubmitting(true)
    try {
      await fetch(`/api/companies/${selectedCompanyId}/weekly-check-in/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInId,
          taskStatus,
          teamChanges,
          teamChangesNote: teamChanges ? teamChangesNote : null,
          customerChanges,
          customerChangesNote: customerChanges ? customerChangesNote : null,
          confidenceRating,
          additionalNotes: additionalNotes.trim() || null,
        }),
      })
      setDone(true)
      setTimeout(onComplete, 1500)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setSubmitting(true)
    try {
      await fetch(`/api/companies/${selectedCompanyId}/weekly-check-in/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInId, skipped: true }),
      })
      onComplete()
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-card rounded-xl p-8 text-center max-w-sm mx-4">
          <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold">Check-in complete</h3>
          <p className="text-sm text-muted-foreground mt-1">Your input keeps your exit data fresh.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-card rounded-t-xl sm:rounded-xl w-full sm:max-w-md mx-0 sm:mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold">Weekly Check-In</h2>
            <p className="text-xs text-muted-foreground">Question {step} of 5</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mx-5 h-1 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Questions */}
        <div className="px-5 pb-6 min-h-[200px]">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Are you making progress on your top action item?</h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: 'yes', label: 'Yes, on track', emoji: '' },
                  { value: 'not_yet', label: 'Not yet, but working on it', emoji: '' },
                  { value: 'blocked', label: "I'm blocked", emoji: '' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                      taskStatus === opt.value
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border hover:border-primary/40'
                    }`}
                    onClick={() => setTaskStatus(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Any team changes this week?</h3>
              <p className="text-xs text-muted-foreground">Hires, departures, role changes</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`px-4 py-3 rounded-lg border text-sm transition-colors ${
                    teamChanges === true ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setTeamChanges(true)}
                >
                  Yes
                </button>
                <button
                  className={`px-4 py-3 rounded-lg border text-sm transition-colors ${
                    teamChanges === false ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setTeamChanges(false)}
                >
                  No changes
                </button>
              </div>
              {teamChanges === true && (
                <Textarea
                  value={teamChangesNote}
                  onChange={(e) => setTeamChangesNote(e.target.value)}
                  placeholder="Brief details..."
                  rows={2}
                  className="text-sm"
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Any customer changes this week?</h3>
              <p className="text-xs text-muted-foreground">Won/lost clients, concentration shifts</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`px-4 py-3 rounded-lg border text-sm transition-colors ${
                    customerChanges === true ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setCustomerChanges(true)}
                >
                  Yes
                </button>
                <button
                  className={`px-4 py-3 rounded-lg border text-sm transition-colors ${
                    customerChanges === false ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setCustomerChanges(false)}
                >
                  No changes
                </button>
              </div>
              {customerChanges === true && (
                <Textarea
                  value={customerChangesNote}
                  onChange={(e) => setCustomerChangesNote(e.target.value)}
                  placeholder="Brief details..."
                  rows={2}
                  className="text-sm"
                />
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">How confident do you feel about your exit readiness?</h3>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`h-12 w-12 rounded-full border text-sm font-semibold transition-colors ${
                      confidenceRating === n
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/40'
                    }`}
                    onClick={() => setConfidenceRating(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground px-1">
                <span>Not confident</span>
                <span>Very confident</span>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Anything else a buyer should know about?</h3>
              <p className="text-xs text-muted-foreground">Optional — new risks, opportunities, or context</p>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Nothing comes to mind..."
                rows={3}
                className="text-sm"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex items-center justify-between border-t pt-4">
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={handleSkip}
            disabled={submitting}
          >
            Skip this week
          </button>
          <Button
            onClick={handleNext}
            disabled={!canAdvance || submitting}
            size="sm"
          >
            {step === 5 ? (submitting ? 'Submitting...' : 'Submit') : 'Next'}
            {step < 5 && <ChevronRight className="h-3 w-3 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
