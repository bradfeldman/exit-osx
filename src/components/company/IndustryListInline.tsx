'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getFlattenedIndustryOptions,
  type FlattenedIndustryOption,
} from '@/lib/data/industries'

interface IndustryListInlineProps {
  value?: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }
  onSelect: (selection: {
    icbIndustry: string
    icbSuperSector: string
    icbSector: string
    icbSubSector: string
  }) => void
  onClose: () => void
}

export function IndustryListInline({ value, onSelect, onClose }: IndustryListInlineProps) {
  const [search, setSearch] = useState('')
  const [expandedIndustries, setExpandedIndustries] = useState<Set<string>>(new Set())

  // Memoize flattened options
  const allOptions = useMemo(() => getFlattenedIndustryOptions(), [])

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return allOptions

    const searchLower = search.toLowerCase()
    return allOptions.filter(
      (option) =>
        option.searchString.includes(searchLower) ||
        option.subSectorLabel.toLowerCase().includes(searchLower) ||
        option.sectorLabel.toLowerCase().includes(searchLower) ||
        option.superSectorLabel.toLowerCase().includes(searchLower) ||
        option.industryLabel.toLowerCase().includes(searchLower)
    )
  }, [allOptions, search])

  // Group filtered options by industry
  const groupedOptions = useMemo(() => {
    const groups: Record<string, FlattenedIndustryOption[]> = {}

    for (const option of filteredOptions) {
      if (!groups[option.industryLabel]) {
        groups[option.industryLabel] = []
      }
      groups[option.industryLabel].push(option)
    }

    return groups
  }, [filteredOptions])

  // Auto-expand groups when searching
  const effectiveExpandedIndustries = useMemo(() => {
    if (search.trim()) {
      // When searching, expand all groups that have matches
      return new Set(Object.keys(groupedOptions))
    }
    return expandedIndustries
  }, [search, groupedOptions, expandedIndustries])

  const toggleIndustry = (industry: string) => {
    if (search.trim()) return // Don't toggle when searching
    setExpandedIndustries(prev => {
      const next = new Set(prev)
      if (next.has(industry)) {
        next.delete(industry)
      } else {
        next.add(industry)
      }
      return next
    })
  }

  const handleSelect = (option: FlattenedIndustryOption) => {
    onSelect({
      icbIndustry: option.icbIndustry,
      icbSuperSector: option.icbSuperSector,
      icbSector: option.icbSector,
      icbSubSector: option.icbSubSector,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden"
    >
      <div className="border-2 border-primary/30 rounded-xl bg-card overflow-hidden">
        {/* Header with search */}
        <div className="p-3 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">Select Industry Classification</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search industries..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Scrollable list */}
        <div className="max-h-[300px] overflow-y-auto">
          {Object.keys(groupedOptions).length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No industries found matching &quot;{search}&quot;
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(groupedOptions).map(([industryLabel, options]) => {
                const isExpanded = effectiveExpandedIndustries.has(industryLabel)

                return (
                  <div key={industryLabel}>
                    {/* Industry header */}
                    <button
                      type="button"
                      onClick={() => toggleIndustry(industryLabel)}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="font-medium text-sm text-foreground">{industryLabel}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {options.length} {options.length === 1 ? 'option' : 'options'}
                      </span>
                    </button>

                    {/* Sub-sectors */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-muted/20"
                        >
                          {options.map((option) => {
                            const isSelected = value?.icbSubSector === option.icbSubSector

                            return (
                              <button
                                key={option.icbSubSector}
                                type="button"
                                onClick={() => handleSelect(option)}
                                className={cn(
                                  "w-full flex items-start gap-3 px-4 py-2.5 pl-10 text-left transition-colors",
                                  isSelected
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/50"
                                )}
                              >
                                <div className={cn(
                                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                                  isSelected
                                    ? "border-primary bg-primary"
                                    : "border-border"
                                )}>
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm font-medium",
                                    isSelected ? "text-primary" : "text-foreground"
                                  )}>
                                    {option.subSectorLabel}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {option.superSectorLabel} → {option.sectorLabel}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          Click an industry to expand, then select a sub-sector
        </div>
      </div>
    </motion.div>
  )
}
