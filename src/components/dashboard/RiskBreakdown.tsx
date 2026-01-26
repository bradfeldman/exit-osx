'use client'

import { motion } from 'framer-motion'
import { ActionCenter } from './ActionCenter'

interface RiskCategory {
  key: string
  label: string
  score: number
}

interface Constraint {
  category: string
  score: number
}

interface RiskBreakdownProps {
  categories: RiskCategory[]
  topConstraints: Constraint[]
  hasAssessment?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 70) return 'from-green-500 to-green-400'
  if (score >= 50) return 'from-yellow-500 to-yellow-400'
  return 'from-red-500 to-red-400'
}

function getScoreTextColor(score: number): string {
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

function getScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-green-100'
  if (score >= 50) return 'bg-yellow-100'
  return 'bg-red-100'
}

export function RiskBreakdown({ categories, topConstraints: _topConstraints, hasAssessment = true }: RiskBreakdownProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="relative py-8 border-t border-border"
    >
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
        Buyer Readiness Index (BRI) Breakdown
      </h3>

      {/* Risk Category Grid - 2x3 */}
      <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 ${!hasAssessment ? 'opacity-50' : ''}`}>
        {categories.map((category, index) => (
          <motion.div
            key={category.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.08 }}
            className="group relative p-4 bg-gradient-to-br from-muted/30 to-transparent rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-foreground">{category.label}</span>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7 + index * 0.08, type: "spring", stiffness: 200 }}
                className={`text-sm font-bold px-2 py-0.5 rounded-md ${hasAssessment ? `${getScoreBgColor(category.score)} ${getScoreTextColor(category.score)}` : 'bg-muted text-muted-foreground'}`}
              >
                {category.score}%
              </motion.span>
            </div>

            {/* Animated progress bar */}
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${hasAssessment ? getScoreColor(category.score) : 'from-gray-300 to-gray-300'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(category.score, 5)}%` }}
                transition={{ duration: 0.8, delay: 0.6 + index * 0.1, ease: "easeOut" }}
              />
            </div>

            {/* Hover indicator */}
            <motion.div
              className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            />
          </motion.div>
        ))}
      </div>

      {/* Action Center */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <ActionCenter hasAssessment={hasAssessment} />
      </motion.div>
    </motion.div>
  )
}
