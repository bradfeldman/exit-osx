'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react'

interface TaskData {
  id: string
  title: string
  description: string
  richDescription: { whatToDo?: string; whyItMatters?: string; howToDoIt?: string } | null
  briCategory: string
  status: string
  effortLevel: string
  normalizedValue: number | null
  completedAt: string | null
  dueDate: string | null
  buyerConsequence: string | null
  companyName: string
  subSteps: { id: string; title: string; order: number; completed: boolean }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  FINANCIAL: 'Financial',
  TRANSFERABILITY: 'Transferability',
  OPERATIONAL: 'Operational',
  MARKET: 'Market Position',
  LEGAL_TAX: 'Legal & Tax',
  PERSONAL: 'Personal Readiness',
}

const EFFORT_LABELS: Record<string, string> = {
  MINIMAL: '< 1 hour',
  LOW: '1-2 hours',
  MODERATE: 'Half day',
  HIGH: '1-2 days',
  MAJOR: '1+ week',
}

export default function SharedTaskPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [task, setTask] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [notes, setNotes] = useState('')
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    fetch(`/api/task-share/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Invalid or expired link')
        const data = await res.json()
        setTask(data.task)
        if (data.task.status === 'COMPLETED') setCompleted(true)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleToggleSubStep = async (subStepId: string) => {
    if (!task) return
    const res = await fetch(`/api/task-share/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subStepId }),
    })
    if (res.ok) {
      setTask({
        ...task,
        subSteps: task.subSteps.map((s) =>
          s.id === subStepId ? { ...s, completed: !s.completed } : s
        ),
      })
    }
  }

  const handleComplete = async () => {
    setCompleting(true)
    const res = await fetch(`/api/task-share/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completionNotes: notes || undefined }),
    })
    if (res.ok) {
      setCompleted(true)
    }
    setCompleting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Link Invalid</h1>
          <p className="text-gray-500 mt-2">This task link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Task Complete</h1>
          <p className="text-gray-500 mt-2">
            Thank you! This task has been marked as complete for {task.companyName}.
          </p>
        </div>
      </div>
    )
  }

  const rd = task.richDescription as { whatToDo?: string; whyItMatters?: string; howToDoIt?: string } | null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-1">
            Task for {task.companyName}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
          <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">
              {CATEGORY_LABELS[task.briCategory] || task.briCategory}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {EFFORT_LABELS[task.effortLevel] || task.effortLevel}
            </span>
            {task.dueDate && (
              <span>
                Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <p className="text-gray-700">{task.description}</p>

          {rd?.whatToDo && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">What to do</h3>
              <p className="text-sm text-gray-600">{rd.whatToDo}</p>
            </div>
          )}

          {rd?.howToDoIt && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">How to do it</h3>
              <p className="text-sm text-gray-600">{rd.howToDoIt}</p>
            </div>
          )}

          {rd?.whyItMatters && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Why it matters</h3>
              <p className="text-sm text-gray-600">{rd.whyItMatters}</p>
            </div>
          )}

          {task.buyerConsequence && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Buyer impact:</span> {task.buyerConsequence}
              </p>
            </div>
          )}
        </div>

        {/* Sub-steps */}
        {task.subSteps.length > 0 && (
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Steps</h3>
            <div className="space-y-2">
              {task.subSteps.map((step) => (
                <label
                  key={step.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={step.completed}
                    onChange={() => handleToggleSubStep(step.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${step.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {step.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Completion */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Mark as Complete</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about what was done..."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
          />
          <button
            onClick={handleComplete}
            disabled={completing}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {completing ? 'Completing...' : (
              <>
                Mark Task Complete
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Powered by <a href="https://exitosx.com" className="text-gray-500 hover:underline">Exit OSx</a>
          </p>
        </div>
      </div>
    </div>
  )
}
