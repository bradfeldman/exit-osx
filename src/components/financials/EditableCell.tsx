'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface EditableCellProps {
  value: number | null
  periodId: string
  field: string
  format: 'currency' | 'percent'
  isDirty: boolean
  disabled?: boolean
  onChange: (periodId: string, field: string, value: number) => void
}

function formatDisplayValue(value: number | null, format: 'currency' | 'percent'): string {
  if (value === null || value === undefined) return '-'

  if (format === 'currency') {
    const absValue = Math.abs(value)
    if (absValue >= 1_000_000) {
      return `${value < 0 ? '-' : ''}$${(absValue / 1_000_000).toFixed(1)}M`
    }
    if (absValue >= 1_000) {
      return `${value < 0 ? '-' : ''}$${(absValue / 1_000).toFixed(0)}K`
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (format === 'percent') {
    return `${(value * 100).toFixed(1)}%`
  }

  return value.toLocaleString()
}

function parseInputValue(input: string): number {
  // Remove currency symbols, commas, and whitespace
  const cleaned = input.replace(/[$,\s]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function EditableCell({
  value,
  periodId,
  field,
  format,
  isDirty,
  disabled = false,
  onChange,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    if (disabled) return
    setInputValue(value?.toString() ?? '')
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    const newValue = parseInputValue(inputValue)
    if (newValue !== value) {
      onChange(periodId, field, newValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBlur()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setInputValue(value?.toString() ?? '')
    } else if (e.key === 'Tab') {
      // Let the browser handle tab navigation naturally
      handleBlur()
    }
  }

  if (disabled) {
    return (
      <span className="text-gray-400">
        {formatDisplayValue(value, format)}
      </span>
    )
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full px-2 py-1 text-right font-mono text-sm',
          'border border-primary rounded',
          'focus:outline-none focus:ring-2 focus:ring-primary/50',
          'bg-white'
        )}
      />
    )
  }

  return (
    <span
      onClick={handleClick}
      className={cn(
        'block px-2 py-1 rounded cursor-pointer transition-colors',
        'hover:bg-primary/10',
        isDirty && 'bg-amber-100 border border-amber-300'
      )}
    >
      {formatDisplayValue(value, format)}
    </span>
  )
}
