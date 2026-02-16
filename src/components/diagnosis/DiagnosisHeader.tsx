'use client'

import { useSyncExternalStore } from 'react'
import { motion } from '@/lib/motion'
import { useCountUpScore } from '@/hooks/useCountUp'
import { Badge } from '@/components/ui/badge'

const emptySubscribe = () => () => {}
function useIsClient() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

interface DiagnosisHeaderProps {
  briScore: number | null
  isEstimated: boolean
}

export function DiagnosisHeader({ briScore, isEstimated }: DiagnosisHeaderProps) {
  const isClient = useIsClient()
  const { value: animatedScore } = useCountUpScore(briScore ?? 0, { delay: 200 })

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">YOUR BUYER READINESS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How buyers evaluate your business
        </p>
        {isEstimated && (
          <p className="text-xs text-muted-foreground mt-2">
            Complete your first category to get a personalized score.
          </p>
        )}
      </div>
      <div className="text-right">
        {briScore !== null ? (
          <>
            <motion.div
              key={briScore}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-5xl font-bold text-primary"
            >
              {isClient ? animatedScore : briScore}
            </motion.div>
            <p className="text-sm text-muted-foreground">Buyer Readiness Index</p>
            {isEstimated && (
              <Badge variant="secondary" className="mt-1">Estimated</Badge>
            )}
          </>
        ) : (
          <>
            <div className="text-5xl font-bold text-muted-foreground/30">—</div>
            <p className="text-sm text-muted-foreground">Buyer Readiness Index</p>
          </>
        )}
      </div>
    </div>
  )
}
