'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Search,
  User,
  Building2,
  Mail,
  Loader2,
  Plus,
} from 'lucide-react'

interface SearchResult {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedInUrl: string | null
  currentTitle: string | null
  currentCompany?: {
    id: string
    name: string
  } | null
  _count?: {
    dealContacts: number
  }
}

interface ContactSearchProps {
  /** Called when a contact is selected */
  onSelect: (contact: SearchResult) => void
  /** IDs of contacts to exclude from results (already added) */
  excludeIds?: string[]
  /** Placeholder text */
  placeholder?: string
  /** Whether to show the "create new" option */
  allowCreate?: boolean
  /** Called when user wants to create new contact */
  onCreateNew?: (searchTerm: string) => void
  className?: string
}

const resultVariants = {
  hidden: { opacity: 0, y: -5 },
  visible: { opacity: 1, y: 0 },
}

export function ContactSearch({
  onSelect,
  excludeIds = [],
  placeholder = 'Search contacts by name or email...',
  allowCreate = false,
  onCreateNew,
  className,
}: ContactSearchProps) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const searchContacts = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(
        `/api/contact-system/canonical/people?search=${encodeURIComponent(query)}&limit=10`
      )
      if (res.ok) {
        const data = await res.json()
        // Filter out excluded contacts
        const filtered = (data.people || []).filter(
          (p: SearchResult) => !excludeIds.includes(p.id)
        )
        setResults(filtered)
      }
    } catch (error) {
      console.error('Error searching contacts:', error)
    } finally {
      setIsSearching(false)
    }
  }, [excludeIds])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchContacts(search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, searchContacts])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isFocused || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsFocused(false)
        break
    }
  }

  const handleSelect = (contact: SearchResult) => {
    onSelect(contact)
    setSearch('')
    setResults([])
    setIsFocused(false)
  }

  const showDropdown = isFocused && (results.length > 0 || (search.length >= 2 && !isSearching))

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow click on result
            setTimeout(() => setIsFocused(false), 200)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden"
          >
            {results.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                {results.map((contact, index) => (
                  <motion.button
                    key={contact.id}
                    variants={resultVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleSelect(contact)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors',
                      selectedIndex === index && 'bg-muted/50'
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {contact.currentTitle && (
                          <span className="truncate">{contact.currentTitle}</span>
                        )}
                        {contact.currentCompany && (
                          <>
                            {contact.currentTitle && <span>at</span>}
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3" />
                              {contact.currentCompany.name}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {contact.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {contact._count?.dealContacts !== undefined &&
                      contact._count.dealContacts > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {contact._count.dealContacts} deals
                        </Badge>
                      )}
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>No contacts found for &quot;{search}&quot;</p>
                {allowCreate && onCreateNew && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onCreateNew(search)}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create new contact
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
