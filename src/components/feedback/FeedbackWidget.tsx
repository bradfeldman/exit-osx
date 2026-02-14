'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquarePlus, X, Bug, Lightbulb, ArrowUpCircle, HelpCircle, Send, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'other'

const CATEGORIES: { value: FeedbackCategory; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'bug', label: 'Bug', icon: <Bug className="w-4 h-4" />, description: 'Something is broken' },
  { value: 'feature', label: 'Feature', icon: <Lightbulb className="w-4 h-4" />, description: 'New idea or request' },
  { value: 'improvement', label: 'Improve', icon: <ArrowUpCircle className="w-4 h-4" />, description: 'Make something better' },
  { value: 'other', label: 'Other', icon: <HelpCircle className="w-4 h-4" />, description: 'General feedback' },
]

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus textarea when category is selected
  useEffect(() => {
    if (category && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [category])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 5) {
      setError('Please provide more detail (at least 5 characters)')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category || 'other',
          description: description.trim(),
          currentPage: window.location.pathname,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setSubmitted(true)
      setTimeout(() => {
        setIsOpen(false)
        // Reset after close animation
        setTimeout(() => {
          setCategory(null)
          setDescription('')
          setSubmitted(false)
          setError(null)
        }, 200)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    setCategory(null)
    setDescription('')
    setSubmitted(false)
    setError(null)
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-100 text-sm font-medium"
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Feedback panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-end justify-end p-4 sm:p-6">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20" aria-hidden="true" />

          {/* Panel */}
          <div
            ref={panelRef}
            className="relative w-full sm:w-96 bg-card rounded-2xl border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {submitted ? 'Thank you!' : 'Send Feedback'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success state */}
            {submitted ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-foreground font-medium">Feedback received</p>
                <p className="text-sm text-muted-foreground mt-1">
                  We&apos;ll review this and follow up if needed.
                </p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                {/* Category selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    What type of feedback?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-xs ${
                          category === cat.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cat.icon}
                        <span className="font-medium">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    {category === 'bug' ? 'What happened?' : 'Tell us more'}
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      category === 'bug'
                        ? 'Describe what went wrong and what you expected...'
                        : category === 'feature'
                          ? 'Describe the feature you would like...'
                          : 'Share your thoughts...'
                    }
                    rows={4}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                {/* Submit */}
                <div className="flex justify-end pt-1 pb-1">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !description.trim()}
                    size="sm"
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Feedback
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
