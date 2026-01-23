'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface GenerateActionPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  currentTaskCount: number
  onSuccess: () => void
}

export function GenerateActionPlanDialog({
  open,
  onOpenChange,
  companyId,
  currentTaskCount,
  onSuccess,
}: GenerateActionPlanDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [dueDate, setDueDate] = useState('')
  const [carryForward, setCarryForward] = useState<boolean | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate date constraints
  const today = new Date()
  const minDate = today.toISOString().split('T')[0]
  const maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const handleClose = () => {
    setStep(1)
    setDueDate('')
    setCarryForward(null)
    setError(null)
    onOpenChange(false)
  }

  const handleNextStep = () => {
    if (!dueDate) {
      setError('Please select a due date')
      return
    }
    setError(null)
    setStep(2)
  }

  const handleGenerate = async () => {
    if (carryForward === null) {
      setError('Please choose whether to carry forward existing tasks')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/companies/${companyId}/action-plan/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dueDate,
          carryForward,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate action plan')
      }

      onSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Action Plan</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Set the target completion date for your action plan.'
              : 'Choose how to handle your existing tasks.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="due-date">Action Plan Due Date</Label>
              <input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={minDate}
                max={maxDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground">
                Select a date within the next 90 days
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="py-4 space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Due Date:</span> {formatDate(dueDate)}
              </p>
              {currentTaskCount > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Current tasks:</span> {currentTaskCount} non-completed
                </p>
              )}
            </div>

            {currentTaskCount > 0 ? (
              <div className="space-y-3">
                <Label>Carry forward existing tasks?</Label>
                <div className="space-y-2">
                  <button
                    onClick={() => setCarryForward(true)}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      carryForward === true
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">Yes, keep existing tasks</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Your {currentTaskCount} non-completed tasks will remain. New tasks will fill remaining slots.
                    </p>
                  </button>
                  <button
                    onClick={() => setCarryForward(false)}
                    className={`w-full p-3 text-left border rounded-lg transition-colors ${
                      carryForward === false
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">No, start fresh</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Current tasks return to the pool. The system will select the best tasks for your new plan.
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  No existing tasks to carry forward. A fresh action plan will be generated from your task pool.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleNextStep}>
                Next
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || (currentTaskCount > 0 && carryForward === null)}
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Generating...
                  </>
                ) : (
                  'Generate Action Plan'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
