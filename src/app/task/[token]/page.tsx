'use client'

import { useState, useEffect, use } from 'react'
import { CheckCircle2, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import styles from '@/components/task/task-public.module.css'

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
      <div className={styles.centeredScreen}>
        <div className={styles.centeredInner}>
          <div className={styles.spinner} />
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className={styles.centeredScreen}>
        <div className={styles.centeredInner}>
          <AlertTriangle style={{ width: 48, height: 48, color: '#F59E0B', margin: '0 auto 16px' }} />
          <h1 className={styles.stateTitle}>Link Invalid</h1>
          <p className={styles.stateMessage}>This task link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className={styles.centeredScreen}>
        <div className={styles.centeredInner}>
          <div className={styles.successIcon}>
            <CheckCircle2 style={{ width: 32, height: 32, color: '#16A34A' }} />
          </div>
          <h1 className={styles.stateTitle}>Task Complete</h1>
          <p className={styles.stateMessage}>
            Thank you! This task has been marked as complete for {task.companyName}.
          </p>
        </div>
      </div>
    )
  }

  const rd = task.richDescription as { whatToDo?: string; whyItMatters?: string; howToDoIt?: string } | null

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.taskHeader}>
          <p className={styles.taskCompany}>Task for {task.companyName}</p>
          <h1 className={styles.taskTitle}>{task.title}</h1>
          <div className={styles.taskMeta}>
            <span className={styles.taskCategory}>
              {CATEGORY_LABELS[task.briCategory] || task.briCategory}
            </span>
            <span className={styles.taskMetaItem}>
              <Clock style={{ width: 14, height: 14 }} />
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
        <div className={styles.card}>
          <p className={styles.description}>{task.description}</p>

          {rd?.whatToDo && (
            <div className={styles.descriptionSection}>
              <h3 className={styles.sectionHeading}>What to do</h3>
              <p className={styles.sectionBody}>{rd.whatToDo}</p>
            </div>
          )}

          {rd?.howToDoIt && (
            <div className={styles.descriptionSection}>
              <h3 className={styles.sectionHeading}>How to do it</h3>
              <p className={styles.sectionBody}>{rd.howToDoIt}</p>
            </div>
          )}

          {rd?.whyItMatters && (
            <div className={styles.descriptionSection}>
              <h3 className={styles.sectionHeading}>Why it matters</h3>
              <p className={styles.sectionBody}>{rd.whyItMatters}</p>
            </div>
          )}

          {task.buyerConsequence && (
            <div className={styles.buyerImpact}>
              <p className={styles.buyerImpactText}>
                <strong>Buyer impact:</strong> {task.buyerConsequence}
              </p>
            </div>
          )}
        </div>

        {/* Sub-steps */}
        {task.subSteps.length > 0 && (
          <div className={styles.stepsCard}>
            <h3 className={styles.stepsTitle}>Steps</h3>
            <div className={styles.stepsList}>
              {task.subSteps.map((step) => (
                <label key={step.id} className={styles.stepLabel}>
                  <input
                    type="checkbox"
                    checked={step.completed}
                    onChange={() => handleToggleSubStep(step.id)}
                    className={styles.stepCheckbox}
                  />
                  <span className={step.completed ? styles.stepTextDone : styles.stepText}>
                    {step.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Completion */}
        <div className={styles.completionCard}>
          <h3 className={styles.completionTitle}>Mark as Complete</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about what was done..."
            rows={3}
            className={styles.textarea}
          />
          <button
            onClick={handleComplete}
            disabled={completing}
            className={styles.completeButton}
          >
            {completing ? 'Completing...' : (
              <>
                Mark Task Complete
                <ArrowRight style={{ width: 16, height: 16 }} />
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className={styles.pageFooter}>
          <p className={styles.footerText}>
            Powered by{' '}
            <a href="https://exitosx.com" className={styles.footerLink}>Exit OSx</a>
          </p>
        </div>
      </div>
    </div>
  )
}
