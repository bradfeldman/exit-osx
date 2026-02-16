'use client'

import { CheckCircle, Clock } from 'lucide-react'
import { useCountUpScore } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface ReadinessHeaderProps {
  percentage: number
  documentsUploaded: number
  documentsExpected: number
  lastUploadAt: string | null
  staleCount: number
  dueSoonCount: number
  categories: Array<{
    id: string
    label: string
    documentsUploaded: number
    documentsExpected: number
    percentage: number
  }>
}

export function ReadinessHeader({
  percentage,
  documentsUploaded,
  documentsExpected,
  lastUploadAt,
  staleCount,
  dueSoonCount,
  categories,
}: ReadinessHeaderProps) {
  const { value: animatedPercentage } = useCountUpScore(percentage)
  const [isAnimated, setIsAnimated] = useState(false)

  useEffect(() => {
    // Trigger bar animations after mount
    const timer = setTimeout(() => setIsAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Calculate stroke properties for the progress ring
  const radius = 28
  const strokeWidth = 5
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const ringColor = percentage >= 70 ? '#10B981' : 'var(--burnt-orange)'
  const statusLabel = percentage === 100 ? 'complete' : 'buyer-ready'
  const statusColor = percentage === 100 ? 'text-emerald-600' : 'text-muted-foreground'

  // Format last upload date
  const formatLastUpload = (date: string | null) => {
    if (!date) return 'No uploads yet'
    const uploadDate = new Date(date)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return uploadDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="bg-card rounded-xl border border-border/50 p-6">
      {/* Title */}
      <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase mb-6">
        Your Evidence Room
      </h2>

      {/* Three-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left column: Progress ring */}
        <div className="flex-shrink-0 flex flex-col items-center lg:items-start">
          <div className="relative">
            <svg
              className="transform -rotate-90"
              width="72"
              height="72"
              viewBox="0 0 72 72"
            >
              {/* Background track */}
              <circle
                className="text-muted/20"
                stroke="currentColor"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx="36"
                cy="36"
              />
              {/* Progress arc */}
              <circle
                stroke={ringColor}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={normalizedRadius}
                cx="36"
                cy="36"
                style={{
                  transition: 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display font-bold text-lg">
                {animatedPercentage}%
              </span>
            </div>
          </div>
          {/* Status label */}
          <p className={cn('text-xs mt-2', statusColor)}>
            {statusLabel}
          </p>
        </div>

        {/* Middle column: Document counts and category bars */}
        <div className="flex-1 space-y-4">
          {/* Overall count */}
          <p className="text-sm font-medium">
            {documentsUploaded} of {documentsExpected} documents
          </p>

          {/* Category progress bars */}
          <div className="space-y-2.5">
            {categories.map((category, index) => {
              const barColor = category.percentage >= 70 ? 'bg-emerald-600' : 'bg-[var(--burnt-orange)]'
              return (
                <div key={category.id} className="flex items-center gap-2">
                  {/* Category label */}
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
                    {category.label}
                  </span>
                  {/* Progress bar */}
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-[400ms] ease-out',
                        barColor
                      )}
                      style={{
                        width: isAnimated ? `${category.percentage}%` : '0%',
                        transitionDelay: `${index * 50}ms`,
                      }}
                    />
                  </div>
                  {/* Count */}
                  <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
                    {category.documentsUploaded}/{category.documentsExpected}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column: Staleness and last upload */}
        <div className="flex-shrink-0 flex flex-col items-start lg:items-end gap-3 text-right">
          {/* Staleness summary */}
          <div className="flex items-center gap-2">
            {staleCount === 0 ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600">
                  All documents current
                </span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-600">
                  {staleCount} need{staleCount === 1 ? 's' : ''} refresh
                </span>
              </>
            )}
          </div>

          {/* Last upload */}
          <p className="text-xs text-muted-foreground">
            Last upload: {formatLastUpload(lastUploadAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
