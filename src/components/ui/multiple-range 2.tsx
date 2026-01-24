'use client'

interface MultipleRangeProps {
  low: number
  high: number
  current: number | null
}

export function MultipleRange({ low, high, current }: MultipleRangeProps) {
  // Calculate position as percentage
  const range = high - low
  const position = current !== null
    ? Math.min(100, Math.max(0, ((current - low) / range) * 100))
    : 50

  return (
    <div className="w-full">
      {/* Range bar */}
      <div className="relative h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full">
        {/* Current position marker */}
        {current !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#B87333] border-2 border-white shadow-md transition-all"
            style={{ left: `calc(${position}% - 10px)` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="relative mt-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">{low.toFixed(1)}x</span>
          <span className="text-sm text-muted-foreground">{high.toFixed(1)}x</span>
        </div>
        {/* Current value label - positioned under indicator */}
        {current !== null && (
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${position}%` }}
          >
            <span className="text-sm font-semibold text-[#B87333]">{current.toFixed(1)}x</span>
          </div>
        )}
      </div>
    </div>
  )
}
