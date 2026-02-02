'use client'

import { useState, useEffect } from 'react'
import { useCompany } from '@/contexts/CompanyContext'
import { motion } from '@/lib/motion'
import { Loader2, Target, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
import { DiagnosticQuestionsFlow } from './DiagnosticQuestionsFlow'
import { TaskList } from './TaskList'
import { ProgressSummary } from './ProgressSummary'
import type { Subcategory } from '@/lib/ai/types'

interface ActionPlanContentProps {
  userName?: string
}

interface WeekProgress {
  id: string
  weekNumber: number
  subcategory: string
  status: string
  scoreBefore?: number
  scoreAfter?: number
  tasks?: Task[]
}

interface Task {
  id: string
  title: string
  description: string
  doneDefinition: string
  delegateTo?: string
  estimatedEffort?: string
  whyThisMatters?: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_APPLICABLE'
}

interface DiagnosticResponse {
  id: string
  subcategory: string
  scoreBefore?: number
}

const SUBCATEGORIES: { id: Subcategory; name: string; description: string }[] = [
  { id: 'SCALABILITY', name: 'Scalability', description: 'How well can you grow without proportionally increasing costs?' },
  { id: 'TECHNOLOGY', name: 'Technology', description: 'Quality and integration of your business systems' },
  { id: 'VENDOR', name: 'Vendor Agreements', description: 'Formality and protection of supplier relationships' },
  { id: 'RETENTION', name: 'Employee Retention', description: 'Staff stability and turnover risk' },
]

export function ActionPlanContent({ userName: _userName }: ActionPlanContentProps) {
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState<WeekProgress | null>(null)
  const [diagnostics, setDiagnostics] = useState<DiagnosticResponse[]>([])
  const [previousWeeks, setPreviousWeeks] = useState<WeekProgress[]>([])
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null)

  const fetchData = async () => {
    if (!selectedCompany?.id) return

    setLoading(true)
    try {
      const response = await fetch(`/api/tasks/current?companyId=${selectedCompany.id}`)
      if (!response.ok) throw new Error('Failed to fetch data')

      const data = await response.json()
      setCurrentWeek(data.currentWeek)
      setDiagnostics(data.diagnostics || [])
      setPreviousWeeks(data.previousWeeks || [])
    } catch (error) {
      console.error('Error fetching action plan data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany?.id])

  const handleStartDiagnostic = (subcategory: Subcategory) => {
    setSelectedSubcategory(subcategory)
    setShowDiagnostic(true)
  }

  const handleDiagnosticComplete = () => {
    setShowDiagnostic(false)
    setSelectedSubcategory(null)
    fetchData()
  }

  const handleTaskUpdate = () => {
    fetchData()
  }

  // Find subcategory that needs diagnosis (not yet diagnosed)
  const getNextSubcategory = (): Subcategory | null => {
    const diagnosedSubcategories = diagnostics.map(d => d.subcategory)
    for (const sub of SUBCATEGORIES) {
      if (!diagnosedSubcategories.includes(sub.id)) {
        return sub.id
      }
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Company Selected</h2>
        <p className="text-muted-foreground">Please select a company to view your action plan.</p>
      </div>
    )
  }

  // If showing diagnostic flow
  if (showDiagnostic && selectedSubcategory) {
    return (
      <DiagnosticQuestionsFlow
        companyId={selectedCompany.id}
        subcategory={selectedSubcategory}
        onComplete={handleDiagnosticComplete}
        onBack={() => setShowDiagnostic(false)}
      />
    )
  }

  // If no current week tasks and no diagnostics completed, prompt to start
  const needsDiagnosis = diagnostics.length === 0 || getNextSubcategory() !== null
  const hasTasks = currentWeek?.tasks && currentWeek.tasks.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">
          Operations Improvement Plan
        </h1>
        <p className="text-muted-foreground mt-1">
          Weekly tasks to strengthen your business and increase its value.
        </p>
      </div>

      {/* Progress Summary */}
      <ProgressSummary
        diagnostics={diagnostics}
        previousWeeks={previousWeeks}
        subcategories={SUBCATEGORIES}
      />

      {/* Main Content */}
      {hasTasks ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              This Week&apos;s Tasks
            </h2>
            <span className="text-sm text-muted-foreground">
              Week {currentWeek?.weekNumber} - {
                SUBCATEGORIES.find(s => s.id === currentWeek?.subcategory)?.name
              }
            </span>
          </div>

          <TaskList
            tasks={currentWeek?.tasks || []}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
      ) : needsDiagnosis ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Start Your Diagnosis
                </h2>
                <p className="text-muted-foreground mb-4">
                  Answer a few questions about your operations to get personalized improvement tasks.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  {SUBCATEGORIES.map((sub) => {
                    const isDone = diagnostics.some(d => d.subcategory === sub.id)
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleStartDiagnostic(sub.id)}
                        disabled={isDone}
                        className={`text-left p-4 rounded-lg border transition-all ${
                          isDone
                            ? 'border-border bg-muted/30 cursor-not-allowed'
                            : 'border-border hover:border-primary/50 bg-background hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-primary" />
                          )}
                          <span className={`font-medium ${
                            isDone ? 'text-muted-foreground' : 'text-foreground'
                          }`}>
                            {sub.name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {sub.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            All caught up!
          </h2>
          <p className="text-muted-foreground">
            You&apos;ve completed all your tasks for this week. Check back next week for new improvements.
          </p>
        </div>
      )}
    </div>
  )
}
