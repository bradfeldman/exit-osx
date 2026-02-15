'use client'

import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  /** Enable animated focus glow effect */
  glowOnFocus?: boolean
}

function Input({ className, type, glowOnFocus = false, ...props }: InputProps) {
  const [isFocused, setIsFocused] = React.useState(false)

  const baseClasses = cn(
    "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    "transition-all duration-200",
    className
  )

  if (glowOnFocus) {
    return (
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-md pointer-events-none"
          initial={false}
          animate={{
            boxShadow: isFocused
              ? '0 0 0 3px rgba(184, 115, 51, 0.15), 0 0 12px 2px rgba(184, 115, 51, 0.1)'
              : '0 0 0 0 rgba(184, 115, 51, 0)',
          }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
        <input
          type={type}
          data-slot="input"
          className={baseClasses}
          onFocus={(e) => {
            setIsFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setIsFocused(false)
            props.onBlur?.(e)
          }}
          {...props}
        />
      </div>
    )
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={baseClasses}
      {...props}
    />
  )
}

// Animated label for floating label inputs
interface AnimatedLabelProps {
  className?: string
  isFloating?: boolean
  children: React.ReactNode
  htmlFor?: string
  onClick?: () => void
}

function AnimatedLabel({ className, isFloating, children, htmlFor, onClick }: AnimatedLabelProps) {
  return (
    <motion.label
      className={cn(
        "absolute left-3 text-muted-foreground pointer-events-none transition-all cursor-text",
        className
      )}
      htmlFor={htmlFor}
      onClick={onClick}
      initial={false}
      animate={{
        top: isFloating ? '-8px' : '50%',
        fontSize: isFloating ? '12px' : '14px',
        y: isFloating ? 0 : '-50%',
        backgroundColor: isFloating ? 'var(--background)' : 'transparent',
        paddingLeft: isFloating ? '4px' : '0',
        paddingRight: isFloating ? '4px' : '0',
        color: isFloating ? 'var(--ring)' : 'var(--muted-foreground)',
      }}
      transition={{
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {children}
    </motion.label>
  )
}

// Input with animated floating label
interface FloatingLabelInputProps extends Omit<InputProps, 'placeholder'> {
  label: string
}

function FloatingLabelInput({ label, className, ...props }: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = React.useState(false)
  const [hasValue, setHasValue] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const isFloating = isFocused || hasValue

  return (
    <div className="relative">
      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none"
        initial={false}
        animate={{
          boxShadow: isFocused
            ? '0 0 0 3px rgba(184, 115, 51, 0.15), 0 0 12px 2px rgba(184, 115, 51, 0.1)'
            : '0 0 0 0 rgba(184, 115, 51, 0)',
        }}
        transition={{
          duration: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
      />
      <AnimatedLabel
        htmlFor={props.id}
        isFloating={isFloating}
        onClick={() => inputRef.current?.focus()}
      >
        {label}
      </AnimatedLabel>
      <input
        ref={inputRef}
        data-slot="input"
        className={cn(
          "file:text-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-11 w-full min-w-0 rounded-md border bg-transparent px-3 pt-2 pb-1 text-base shadow-xs outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "transition-all duration-200",
          className
        )}
        onFocus={(e) => {
          setIsFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setIsFocused(false)
          props.onBlur?.(e)
        }}
        onChange={(e) => {
          setHasValue(e.target.value.length > 0)
          props.onChange?.(e)
        }}
        {...props}
      />
    </div>
  )
}

export { Input, AnimatedLabel, FloatingLabelInput }
