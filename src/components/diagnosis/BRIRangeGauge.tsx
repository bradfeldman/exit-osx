'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface BRIRangeGaugeProps {
  briScore: number | null
  isEstimated?: boolean
}

/**
 * BRI Range Gauge
 *
 * Displays the company's BRI score positioned on a visual range showing readiness zones:
 * - 0-40: Critical (red) - Significant buyer concerns
 * - 40-60: Developing (amber) - Needs improvement
 * - 60-75: Strong (gray/primary) - Buyer-ready with minor gaps
 * - 75-100: Excellent (green) - Top-tier readiness
 *
 * The company indicator is positioned proportionally between 0-100.
 */
export function BRIRangeGauge({ briScore, isEstimated = false }: BRIRangeGaugeProps) {
  const { position, zone, zoneLabel, message } = useMemo(() => {
    if (briScore === null) {
      return {
        position: 0,
        zone: 'none' as const,
        zoneLabel: 'Not Assessed',
        message: 'Complete your assessment to see your readiness position',
      }
    }

    // Calculate position as percentage (BRI is already 0-100 scale)
    const pos = Math.min(100, Math.max(0, briScore))

    // Determine zone
    let z: 'critical' | 'developing' | 'strong' | 'excellent'
    let label: string
    let msg: string

    if (briScore < 40) {
      z = 'critical'
      label = 'Critical'
      msg = 'Significant gaps that will concern buyers. Focus on high-impact fixes.'
    } else if (briScore < 60) {
      z = 'developing'
      label = 'Developing'
      msg = 'On the right track, but buyers will see risk. Strong zone starts at 60.'
    } else if (briScore < 75) {
      z = 'strong'
      label = 'Strong'
      msg = 'Buyer-ready with minor gaps. Excellent zone starts at 75.'
    } else {
      z = 'excellent'
      label = 'Excellent'
      msg = 'Top-tier readiness. You\'re positioned to command premium valuations.'
    }

    return { position: pos, zone: z, zoneLabel: label, message: msg }
  }, [briScore])

  if (briScore === null) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">
          Buyer Readiness Position
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your BRI score across typical readiness zones
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge Bar */}
        <div className="space-y-2">
          <div className="relative h-3 rounded-full overflow-hidden bg-zinc-100">
            {/* Critical zone (0-40) */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-300 to-red-200"
              style={{ width: '40%' }}
            />
            {/* Developing zone (40-60) */}
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-amber-200 to-amber-100"
              style={{ left: '40%', width: '20%' }}
            />
            {/* Strong zone (60-75) */}
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-zinc-200 to-zinc-300"
              style={{ left: '60%', width: '15%' }}
            />
            {/* Excellent zone (75-100) */}
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-emerald-200 to-emerald-300"
              style={{ left: '75%', width: '25%' }}
            />

            {/* Zone boundary markers */}
            <div
              className="absolute top-0 bottom-0 w-px bg-zinc-400/40"
              style={{ left: '40%' }}
            />
            <div
              className="absolute top-0 bottom-0 w-px bg-zinc-400/40"
              style={{ left: '60%' }}
            />
            <div
              className="absolute top-0 bottom-0 w-px bg-zinc-400/40"
              style={{ left: '75%' }}
            />

            {/* Current position marker - positioned proportionally between 0 and 100 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full border-2 border-white shadow-md z-10"
              style={{
                left: `${position}%`,
                backgroundColor:
                  zone === 'excellent'
                    ? '#059669'
                    : zone === 'strong'
                      ? '#3D3D3D'
                      : zone === 'developing'
                        ? '#d97706'
                        : '#dc2626',
              }}
            />
          </div>

          {/* Labels */}
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>0</span>
            <span className="font-medium text-foreground">
              You: {briScore} ({zoneLabel})
            </span>
            <span>100</span>
          </div>

          {/* Zone markers */}
          <div className="flex justify-between text-[10px] text-muted-foreground/60">
            <span style={{ marginLeft: '20%' }}>40</span>
            <span style={{ marginLeft: '10%' }}>60</span>
            <span style={{ marginLeft: '5%' }}>75</span>
          </div>
        </div>

        {/* Contextual message */}
        <p className="text-xs text-muted-foreground">{message}</p>

        {/* Estimated badge */}
        {isEstimated && (
          <p className="text-xs text-amber-600 font-medium">
            Preview estimate — Complete all assessments for your final score
          </p>
        )}
      </CardContent>
    </Card>
  )
}
