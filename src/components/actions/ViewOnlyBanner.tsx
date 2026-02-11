'use client'

import { motion } from '@/lib/motion'
import { Eye, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useExposure } from '@/contexts/ExposureContext'

export function ViewOnlyBanner() {
  const { startActing } = useExposure()

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <Eye className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">You are in View Mode</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You can see your full action plan and how tasks close your value gap. When you are ready to start closing your gaps, click below to unlock tasks.
          </p>
          <Button onClick={startActing} size="lg" className="gap-2">
            <Rocket className="h-4 w-4" />
            Start Acting
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
