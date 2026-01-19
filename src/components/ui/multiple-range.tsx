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

  // Calculate position as percentage
  const range = high - low
  const basePosition = current !== null
    ? Math.min(100, Math.max(0, ((current - low) / range) * 100))
    : 50

  // Use drag position if dragging, otherwise use base position
  const displayPosition = dragPosition !== null ? dragPosition : basePosition
  const displayMultiple = dragPosition !== null
    ? low + (dragPosition / 100) * range
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
    const multiple = low + (position / 100) * range
    onDragChange?.(multiple)
  }, [getPositionFromEvent, low, range, onDragChange])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const touch = e.touches[0]
    const position = getPositionFromEvent(touch.clientX)
    setDragPosition(position)
    const multiple = low + (position / 100) * range
    onDragChange?.(multiple)
  }, [getPositionFromEvent, low, range, onDragChange])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const position = getPositionFromEvent(e.clientX)
      setDragPosition(position)
      const multiple = low + (position / 100) * range
      onDragChange?.(multiple)
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const position = getPositionFromEvent(touch.clientX)
      setDragPosition(position)
      const multiple = low + (position / 100) * range
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
  }, [isDragging, getPositionFromEvent, low, range, onDragChange, onDragEnd])

  return (
    <div className="w-full select-none">
      {/* Range bar */}
      <div
        ref={trackRef}
        className="relative h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full cursor-pointer"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
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
            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#B87333] border-2 border-white shadow-md ${
              isDragging ? 'cursor-grabbing scale-110' : 'cursor-grab'
            } transition-transform`}
            style={{ left: `calc(${displayPosition}% - 10px)` }}
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
        {displayMultiple !== null && (
          <div
            className="absolute top-0 -translate-x-1/2 transition-all"
            style={{ left: `${displayPosition}%` }}
          >
            <span className={`text-sm font-semibold ${isDragging ? 'text-[#B87333] scale-110' : 'text-[#B87333]'}`}>
              {displayMultiple.toFixed(1)}x
            </span>
          </div>
        )}
      </div>

      {/* Drag hint */}
      {!isDragging && current !== null && (
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
