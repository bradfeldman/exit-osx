'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'

const PHASES = [
  { message: 'Analyzing your business profile...', duration: 3000 },
  { message: 'Researching market comparables...', duration: 4000 },
  { message: 'Building your valuation model...', duration: 3000 },
  { message: 'Preparing your results...', duration: 2000 },
]

interface CalculatingScreenProps {
  companyName?: string
}

export function CalculatingScreen({ companyName }: CalculatingScreenProps) {
  const [phaseIndex, setPhaseIndex] = useState(0)

  useEffect(() => {
    let elapsed = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = 1; i < PHASES.length; i++) {
      elapsed += PHASES[i - 1].duration
      timers.push(setTimeout(() => setPhaseIndex(i), elapsed))
    }

    return () => timers.forEach(clearTimeout)
  }, [])

  const progress = ((phaseIndex + 1) / PHASES.length) * 100

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      {companyName && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-8"
        >
          {companyName}
        </motion.p>
      )}

      {/* Animated pulse ring */}
      <motion.div
        className="relative w-20 h-20 mb-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
        <div className="absolute inset-4 rounded-full bg-primary/30" />
      </motion.div>

      {/* Phase message */}
      <div className="h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phaseIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-lg font-medium text-foreground"
          >
            {PHASES[phaseIndex].message}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-muted rounded-full mt-8 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}
