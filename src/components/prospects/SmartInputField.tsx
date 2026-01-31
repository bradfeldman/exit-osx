'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { parseInput, ParsedInput } from '@/lib/contact-system/smart-parser'
import { Sparkles, User, Building2, Mail, Phone, Linkedin, Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartInputFieldProps {
  value: string
  onChange: (value: string) => void
  onParsed: (parsed: ParsedInput) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  minRows?: number
}

export function SmartInputField({
  value,
  onChange,
  onParsed,
  placeholder = 'Paste email signature, LinkedIn URL, or contact info...',
  label = 'Smart Input',
  disabled = false,
  minRows = 4,
}: SmartInputFieldProps) {
  const [isParsing, setIsParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedInput | null>(null)

  // Debounced parsing
  const doParse = useCallback(() => {
    if (!value.trim()) {
      setParsed(null)
      onParsed({
        people: [],
        companies: [],
        emails: [],
        phones: [],
        urls: [],
        linkedInUrls: [],
        domains: [],
        raw: '',
      })
      return
    }

    setIsParsing(true)
    // Small delay to show parsing indicator
    setTimeout(() => {
      const result = parseInput(value)
      setParsed(result)
      onParsed(result)
      setIsParsing(false)
    }, 150)
  }, [value, onParsed])

  useEffect(() => {
    const timer = setTimeout(doParse, 300)
    return () => clearTimeout(timer)
  }, [doParse])

  const hasContent = value.trim().length > 0
  const hasResults = parsed && (parsed.people.length > 0 || parsed.companies.length > 0 || parsed.emails.length > 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {label}
        </Label>
        <AnimatePresence>
          {isParsing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <Loader2 className="h-3 w-3 animate-spin" />
              Parsing...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={minRows}
          className={cn(
            'resize-none transition-all',
            hasContent && hasResults && 'border-green-300 dark:border-green-700'
          )}
        />

        {/* Quick Stats Bar */}
        <AnimatePresence>
          {hasContent && parsed && !isParsing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-2 left-2 right-2 flex items-center gap-3 text-xs text-muted-foreground bg-background/90 backdrop-blur-sm rounded-md px-2 py-1.5 border"
            >
              {parsed.people.length > 0 && (
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <User className="h-3 w-3" />
                  {parsed.people.length} person{parsed.people.length > 1 ? 's' : ''}
                </span>
              )}
              {parsed.companies.length > 0 && (
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <Building2 className="h-3 w-3" />
                  {parsed.companies.length} compan{parsed.companies.length > 1 ? 'ies' : 'y'}
                </span>
              )}
              {parsed.emails.length > 0 && (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <Mail className="h-3 w-3" />
                  {parsed.emails.length}
                </span>
              )}
              {parsed.phones.length > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Phone className="h-3 w-3" />
                  {parsed.phones.length}
                </span>
              )}
              {parsed.linkedInUrls.length > 0 && (
                <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                  <Linkedin className="h-3 w-3" />
                  {parsed.linkedInUrls.length}
                </span>
              )}
              {parsed.domains.length > 0 && (
                <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                  <Globe className="h-3 w-3" />
                  {parsed.domains.length}
                </span>
              )}
              {!hasResults && (
                <span className="text-muted-foreground/70">No structured data detected</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="text-xs text-muted-foreground">
        Paste an email signature, LinkedIn profile URL, or any text containing contact information.
        We'll automatically extract names, emails, phone numbers, and company info.
      </p>
    </div>
  )
}
