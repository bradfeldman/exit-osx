'use client'

import { motion } from '@/lib/motion'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import type { Subcategory } from '@/lib/ai/types'

interface DiagnosticResponse {
  id: string
  subcategory: string
  scoreBefore?: number
}

interface WeekProgress {
  id: string
  weekNumber: number
  subcategory: string
  status: string
  scoreBefore?: number
  scoreAfter?: number
}

interface SubcategoryInfo {
  id: Subcategory
  name: string
  description: string
}

interface ProgressSummaryProps {
  diagnostics: DiagnosticResponse[]
  previousWeeks: WeekProgress[]
  subcategories: SubcategoryInfo[]
}

export function ProgressSummary({
  diagnostics,
  previousWeeks,
  subcategories,
}: ProgressSummaryProps) {
  const completedWeeks = previousWeeks.filter(w => w.status === 'COMPLETED').length
  const diagnosedCount = diagnostics.length
  const totalSubcategories = subcategories.length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Diagnosed categories */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {diagnosedCount}/{totalSubcategories}
            </p>
            <p className="text-sm text-muted-foreground">Areas Diagnosed</p>
          </div>
        </div>
      </motion.div>

      {/* Completed weeks */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {completedWeeks}
            </p>
            <p className="text-sm text-muted-foreground">Weeks Completed</p>
          </div>
        </div>
      </motion.div>

      {/* Category progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-xl p-4 sm:col-span-2"
      >
        <p className="text-sm font-medium text-foreground mb-3">Category Progress</p>
        <div className="flex items-center gap-2">
          {subcategories.map((sub) => {
            const isDiagnosed = diagnostics.some(d => d.subcategory === sub.id)
            const weekData = previousWeeks.find(w => w.subcategory === sub.id)
            const isCompleted = weekData?.status === 'COMPLETED'

            return (
              <div
                key={sub.id}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className={`w-full h-2 rounded-full ${
                    isCompleted
                      ? 'bg-green-500'
                      : isDiagnosed
                        ? 'bg-yellow-500'
                        : 'bg-muted'
                  }`}
                />
                <span className="text-xs text-muted-foreground truncate max-w-full">
                  {sub.name}
                </span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted" />
            Not started
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            In progress
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Completed
          </span>
        </div>
      </motion.div>
    </div>
  )
}
