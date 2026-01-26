'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface MultipleRangeProps {
  low: number
  high: number
  current: number | null
  onDragChange?: (multiple: number) => void
  onDragEnd?: () => void
}

export function MultipleRange({ low, high, current, onDragChange, onDragEnd }: MultipleRangeProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  // Determine if current is outside industry range
  const isAboveRange = current !== null && current > high
  const isBelowRange = current !== null && current < low

  // Calculate the effective display range to accommodate out-of-range values
  // When above range: extend to next whole number above current
  // When below range: extend to next whole number below current
  const displayLow = isBelowRange && current !== null ? Math.floor(current) : low
  const displayHigh = isAboveRange && current !== null ? Math.ceil(current) : high
  const displayRange = displayHigh - displayLow

  // Calculate where the industry boundaries sit within the display range
  const industryLowPercent = ((low - displayLow) / displayRange) * 100
  const industryHighPercent = ((high - displayLow) / displayRange) * 100
  const industryWidthPercent = industryHighPercent - industryLowPercent

  // Calculate position as percentage within display range
  const basePosition = current !== null
    ? Math.min(100, Math.max(0, ((current - displayLow) / displayRange) * 100))
    : ((low + high) / 2 - displayLow) / displayRange * 100

  // Use drag position if dragging, otherwise use base position
  const displayPosition = dragPosition !== null ? dragPosition : basePosition
  const displayMultiple = dragPosition !== null
    ? displayLow + (dragPosition / 100) * displayRange
    : current

  const getPositionFromEvent = useCallback((clientX: number): number => {
    if (!trackRef.current) return basePosition
    const rect = trackRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100))
    return percentage
  }, [basePosition])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const position = getPositionFromEvent(e.clientX)
    setDragPosition(position)
    const multiple = displayLow + (position / 100) * displayRange
    onDragChange?.(multiple)
  }, [getPositionFromEvent, displayLow, displayRange, onDragChange])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const touch = e.touches[0]
    const position = getPositionFromEvent(touch.clientX)
    setDragPosition(position)
    const multiple = displayLow + (position / 100) * displayRange
    onDragChange?.(multiple)
  }, [getPositionFromEvent, displayLow, displayRange, onDragChange])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const position = getPositionFromEvent(e.clientX)
      setDragPosition(position)
      const multiple = displayLow + (position / 100) * displayRange
      onDragChange?.(multiple)
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const position = getPositionFromEvent(touch.clientX)
      setDragPosition(position)
      const multiple = displayLow + (position / 100) * displayRange
      onDragChange?.(multiple)
    }

    const handleEnd = () => {
      setIsDragging(false)
      setDragPosition(null)
      onDragEnd?.()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, getPositionFromEvent, displayLow, displayRange, onDragChange, onDragEnd])

  return (
    <div className="w-full select-none">
      {/* Range bar */}
      <div
        ref={trackRef}
        className="relative h-3 rounded-full cursor-pointer overflow-hidden"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Background - full track */}
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800" />

        {/* Discount zone (below industry low) */}
        {isBelowRange && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-200 to-amber-100 dark:from-amber-900/50 dark:to-amber-800/30"
            style={{ width: `${industryLowPercent}%` }}
          />
        )}

        {/* Industry range zone */}
        <div
          className="absolute top-0 bottom-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"
          style={{
            left: `${industryLowPercent}%`,
            width: `${industryWidthPercent}%`,
          }}
        />

        {/* Premium zone (above industry high) */}
        {isAboveRange && (
          <div
            className="absolute top-0 bottom-0 right-0 bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/50"
            style={{
              left: `${industryHighPercent}%`,
              width: `${100 - industryHighPercent}%`,
            }}
          />
        )}

        {/* Industry high boundary marker */}
        {isAboveRange && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500"
            style={{ left: `${industryHighPercent}%` }}
          />
        )}
        {/* Industry low boundary marker */}
        {isBelowRange && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-500"
            style={{ left: `${industryLowPercent}%` }}
          />
        )}

        {/* Base position marker (ghost) - shows where the actual value is when dragging */}
        {current !== null && isDragging && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-300 border-2 border-white shadow-sm opacity-50"
            style={{ left: `calc(${basePosition}% - 10px)` }}
          />
        )}

        {/* Current/dragged position marker */}
        {current !== null && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md ${
              isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'
            } transition-transform ${
              isAboveRange && !isDragging
                ? 'bg-emerald-500'
                : isBelowRange && !isDragging
                  ? 'bg-amber-500'
                  : 'bg-[#B87333]'
            }`}
            style={{ left: `calc(${displayPosition}% - 10px)` }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="relative mt-2 min-h-[20px]">
        <div className="flex justify-between">
          {/* Left edge */}
          <span className="text-sm text-muted-foreground">
            {displayLow.toFixed(1)}x
          </span>
          {/* Right edge */}
          <span className="text-sm text-muted-foreground">
            {displayHigh.toFixed(1)}x
          </span>
        </div>

        {/* Industry high label at its position when above range */}
        {isAboveRange && (
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${industryHighPercent}%` }}
          >
            <span className="text-sm text-muted-foreground">
              {high.toFixed(1)}x
            </span>
          </div>
        )}

        {/* Industry low label at its position when below range */}
        {isBelowRange && (
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${industryLowPercent}%` }}
          >
            <span className="text-sm text-muted-foreground">
              {low.toFixed(1)}x
            </span>
          </div>
        )}

        {/* Current value label - only show when within range */}
        {displayMultiple !== null && !isAboveRange && !isBelowRange && (
          <div
            className="absolute top-0 -translate-x-1/2 transition-all"
            style={{ left: `${displayPosition}%` }}
          >
            <span className={`text-sm font-semibold ${
              isDragging ? 'text-[#B87333] scale-110' : 'text-[#B87333]'
            }`}>
              {displayMultiple.toFixed(1)}x
            </span>
          </div>
        )}
      </div>

      {/* Premium/discount indicator with current value prominently displayed */}
      {isAboveRange && !isDragging && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center mt-2 font-medium">
          <span className="text-sm font-bold">{current!.toFixed(1)}x</span> — Premium ({((current! - high) / high * 100).toFixed(0)}% above industry max)
        </p>
      )}
      {isBelowRange && !isDragging && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2 font-medium">
          <span className="text-sm font-bold">{current!.toFixed(1)}x</span> — Discount ({((low - current!) / low * 100).toFixed(0)}% below industry min)
        </p>
      )}

      {/* Drag hint - only show when within range */}
      {!isDragging && current !== null && !isAboveRange && !isBelowRange && (
        <p className="text-xs text-muted-foreground/60 text-center mt-3">
          Drag to explore value scenarios
        </p>
      )}
      {isDragging && (
        <p className="text-xs text-[#B87333] text-center mt-3 font-medium">
          Release to return to actual multiple
        </p>
      )}
    </div>
  )
}
