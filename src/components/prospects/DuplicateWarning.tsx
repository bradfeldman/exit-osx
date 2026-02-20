'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { AlertTriangle, Building2, User, ExternalLink, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PotentialDuplicate {
  id: string
  name: string
  type: 'company' | 'person'
  matchScore: number
  matchReason: string
  existingData?: {
    email?: string
    website?: string
    linkedInUrl?: string
  }
}

interface DuplicateWarningProps {
  /** Name or email to check for duplicates */
  searchValue: string
  /** Type of entity to check */
  type: 'company' | 'person'
  /** Called when user chooses to use existing record */
  onUseExisting: (duplicate: PotentialDuplicate) => void
  /** Called when user confirms to create new */
  onCreateNew: () => void
  /** API endpoint to check duplicates */
  checkEndpoint?: string
}

export function DuplicateWarning({
  searchValue,
  type,
  onUseExisting,
  onCreateNew,
  checkEndpoint,
}: DuplicateWarningProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const checkDuplicates = async () => {
      if (!searchValue || searchValue.length < 2 || dismissed) {
        setDuplicates([])
        return
      }

      setIsChecking(true)
      try {
        const endpoint =
          checkEndpoint ||
          (type === 'company'
            ? `/api/contact-system/canonical/companies?search=${encodeURIComponent(searchValue)}&limit=5`
            : `/api/contact-system/canonical/people?search=${encodeURIComponent(searchValue)}&limit=5`)

        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          const items = type === 'company' ? data.companies : data.people

          // Transform to duplicates format with match scoring
          const potentialDuplicates: PotentialDuplicate[] = (items || [])
            .filter((item: { name?: string; firstName?: string; lastName?: string }) => {
              const itemName =
                type === 'company'
                  ? item.name
                  : `${item.firstName} ${item.lastName}`.trim()
              // Check if similar enough to be a potential duplicate
              return (
                itemName &&
                (itemName.toLowerCase().includes(searchValue.toLowerCase()) ||
                  searchValue.toLowerCase().includes(itemName.toLowerCase()))
              )
            })
            .slice(0, 3)
            .map(
              (item: {
                id: string
                name?: string
                firstName?: string
                lastName?: string
                email?: string
                website?: string
                linkedInUrl?: string
              }) => ({
                id: item.id,
                name:
                  type === 'company'
                    ? item.name
                    : `${item.firstName} ${item.lastName}`.trim(),
                type,
                matchScore: calculateMatchScore(
                  searchValue,
                  type === 'company'
                    ? item.name || ''
                    : `${item.firstName} ${item.lastName}`.trim()
                ),
                matchReason: 'Name match',
                existingData: {
                  email: item.email,
                  website: item.website,
                  linkedInUrl: item.linkedInUrl,
                },
              })
            )

          setDuplicates(potentialDuplicates)
        }
      } catch (error) {
        console.error('Error checking duplicates:', error)
      } finally {
        setIsChecking(false)
      }
    }

    // Debounce the check
    const timer = setTimeout(checkDuplicates, 500)
    return () => clearTimeout(timer)
  }, [searchValue, type, checkEndpoint, dismissed])

  // Reset dismissed state when search value changes significantly
  useEffect(() => {
    setDismissed(false)
  }, [searchValue])

  if (dismissed || (!isChecking && duplicates.length === 0)) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        className="overflow-hidden"
      >
        <div className="bg-orange-light dark:bg-orange-dark/30 border border-orange/20 dark:border-orange-dark rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-dark flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-orange-dark dark:text-orange">
                {isChecking ? 'Checking for duplicates...' : 'Potential Duplicate Found'}
              </h4>

              {isChecking ? (
                <div className="flex items-center gap-2 mt-2 text-sm text-orange-dark">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching existing records...</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-orange-dark dark:text-orange mt-1">
                    We found {duplicates.length} existing record{duplicates.length > 1 ? 's' : ''}{' '}
                    that might match. Would you like to use an existing record?
                  </p>

                  <div className="mt-3 space-y-2">
                    {duplicates.map((duplicate) => (
                      <DuplicateCard
                        key={duplicate.id}
                        duplicate={duplicate}
                        onUse={() => onUseExisting(duplicate)}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDismissed(true)
                        onCreateNew()
                      }}
                      className="text-orange-dark border-orange/30 hover:bg-orange-light"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Create New Anyway
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

interface DuplicateCardProps {
  duplicate: PotentialDuplicate
  onUse: () => void
}

function DuplicateCard({ duplicate, onUse }: DuplicateCardProps) {
  const Icon = duplicate.type === 'company' ? Building2 : User
  const scoreColor =
    duplicate.matchScore >= 0.9
      ? 'text-red-dark bg-red-light'
      : duplicate.matchScore >= 0.7
        ? 'text-orange-dark bg-orange-light'
        : 'text-orange bg-orange-light'

  return (
    <div className="flex items-center justify-between gap-3 bg-white dark:bg-foreground rounded-lg p-3 border border-orange/20 dark:border-orange-dark">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-orange-light dark:bg-orange-dark flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-orange-dark" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{duplicate.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn('px-1.5 py-0.5 rounded', scoreColor)}>
              {Math.round(duplicate.matchScore * 100)}% match
            </span>
            {duplicate.existingData?.email && (
              <span className="truncate">{duplicate.existingData.email}</span>
            )}
            {duplicate.existingData?.website && (
              <a
                href={duplicate.existingData.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>
      <Button size="sm" variant="ghost" onClick={onUse} className="flex-shrink-0">
        <Check className="h-4 w-4 mr-1" />
        Use This
      </Button>
    </div>
  )
}

/**
 * Calculate match score between two strings (0-1)
 */
function calculateMatchScore(a: string, b: string): number {
  const aLower = a.toLowerCase().trim()
  const bLower = b.toLowerCase().trim()

  // Exact match
  if (aLower === bLower) return 1

  // One contains the other
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    const ratio = Math.min(aLower.length, bLower.length) / Math.max(aLower.length, bLower.length)
    return 0.7 + ratio * 0.25
  }

  // Calculate Levenshtein-like similarity
  const maxLen = Math.max(aLower.length, bLower.length)
  if (maxLen === 0) return 1

  let matches = 0
  const aChars = aLower.split('')
  const bChars = bLower.split('')

  for (const char of aChars) {
    const idx = bChars.indexOf(char)
    if (idx !== -1) {
      matches++
      bChars.splice(idx, 1)
    }
  }

  return matches / maxLen
}
