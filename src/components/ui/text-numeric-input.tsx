'use client'

import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface TextNumericInputProps {
  value: number | null
  onCommit: (value: number | null) => void
  /** Multiplier for display (e.g. 100 to show 0.05 as "5.0") */
  multiplier?: number
  /** Number of decimal places to display */
  decimals?: number
  className?: string
  id?: string
  placeholder?: string
}

/**
 * A text input that displays a numeric value with formatting.
 * The user types freely as text; the value is parsed and committed on blur.
 */
export function TextNumericInput({
  value,
  onCommit,
  multiplier = 1,
  decimals = 1,
  className,
  id,
  placeholder,
}: TextNumericInputProps) {
  const formatValue = useCallback(
    (v: number | null): string => {
      if (v === null || v === undefined) return ''
      return (v * multiplier).toFixed(decimals)
    },
    [multiplier, decimals]
  )

  const [text, setText] = useState(() => formatValue(value))
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes when not focused
  const displayText = isFocused ? text : formatValue(value)

  const handleFocus = () => {
    setIsFocused(true)
    setText(formatValue(value))
    // Select all on focus for easy replacement
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleBlur = () => {
    setIsFocused(false)
    const trimmed = text.trim()
    if (trimmed === '') {
      onCommit(null)
      return
    }
    const parsed = parseFloat(trimmed)
    if (isNaN(parsed)) {
      // Reset to previous value
      setText(formatValue(value))
      return
    }
    onCommit(parsed / multiplier)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setText(formatValue(value))
      inputRef.current?.blur()
    }
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={displayText}
      onChange={(e) => setText(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn(
        'rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'transition-all duration-200',
        className
      )}
    />
  )
}

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  id?: string
  placeholder?: string
}

/**
 * A text input for currency values. Displays formatted with commas,
 * allows free typing, and commits the parsed number on blur.
 */
export function CurrencyInput({
  value,
  onChange,
  className,
  id,
  placeholder,
}: CurrencyInputProps) {
  const formatCurrency = (v: number): string => {
    if (v === 0) return '0'
    return v.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }

  const [text, setText] = useState(() => formatCurrency(value))
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayText = isFocused ? text : formatCurrency(value)

  const handleFocus = () => {
    setIsFocused(true)
    // Show raw number without commas for easier editing
    setText(value === 0 ? '' : String(value))
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const handleBlur = () => {
    setIsFocused(false)
    const cleaned = text.replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    if (isNaN(parsed)) {
      setText(formatCurrency(value))
      return
    }
    onChange(parsed)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') inputRef.current?.blur()
    if (e.key === 'Escape') {
      setText(formatCurrency(value))
      inputRef.current?.blur()
    }
  }

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="decimal"
      value={displayText}
      onChange={(e) => setText(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn(
        'rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'transition-all duration-200',
        className
      )}
    />
  )
}
