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
  // FIN-001 FIX: Option to show full precision values
  showFullPrecision?: boolean
}

// FIN-001 FIX: Support both abbreviated and full precision display
function formatDisplayValue(value: number | null, format: 'currency' | 'percent', fullPrecision: boolean = false): string {
  if (value === null || value === undefined) return '-'

  if (format === 'currency') {
    // FIN-001 FIX: Full precision mode shows exact values with thousand separators
    if (fullPrecision) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    }

    // Abbreviated display for summary views
    const absValue = Math.abs(value)
    if (absValue >= 1_000_000) {
      return `${value < 0 ? '-' : ''}$${(absValue / 1_000_000).toFixed(1)}M`
    }
    // Always use K format for consistency - rounds to nearest thousand
    const kValue = Math.round(absValue / 1_000)
    if (kValue === 0) {
      return '$0'
    }
    return `${value < 0 ? '-' : ''}$${kValue}K`
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
  // FIN-001 FIX: Default to full precision for better data entry experience
  showFullPrecision = true,
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

  // Format number with commas for display in input
  const formatInputValue = (val: number | null): string => {
    if (val === null || val === undefined) return ''
    return new Intl.NumberFormat('en-US').format(val)
  }

  const handleClick = () => {
    if (disabled) return
    setInputValue(formatInputValue(value))
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
        {formatDisplayValue(value, format, showFullPrecision)}
      </span>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    // Allow typing: only keep digits, minus, decimal, and commas
    const cleaned = rawValue.replace(/[^0-9.,-]/g, '')
    // Parse to number and reformat with commas
    const numericValue = parseInputValue(cleaned)
    if (cleaned === '' || cleaned === '-') {
      setInputValue(cleaned)
    } else {
      setInputValue(formatInputValue(numericValue))
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleInputChange}
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

  // A11Y-001 FIX: Add keyboard accessibility for activating edit mode
  const handleActivateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <span
      onClick={handleClick}
      onKeyDown={handleActivateKeyDown}
      // A11Y-001 FIX: Add proper accessibility attributes
      role="button"
      tabIndex={0}
      aria-label={`Edit ${field}: ${formatDisplayValue(value, format, true)}`}
      className={cn(
        'block px-2 py-1 rounded cursor-pointer transition-colors',
        'hover:bg-primary/10',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        isDirty && 'bg-amber-100 border border-amber-300'
      )}
      // FIN-001 FIX: Show full value on hover for abbreviated display
      title={showFullPrecision ? undefined : formatDisplayValue(value, format, true)}
    >
      {formatDisplayValue(value, format, showFullPrecision)}
    </span>
  )
}
