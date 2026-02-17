'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Users, X, Loader2, User, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useDealParticipants } from '@/hooks/useContactSystem'
import { SmartInputField } from '@/components/prospects/SmartInputField'
import { ContactSearch } from '@/components/contacts/ContactSearch'
import { CategoryBadge } from './CategoryBadge'
import { ParticipantDetailPanel } from './ParticipantDetailPanel'
import {
  CONTACT_CATEGORIES,
  CONTACT_CATEGORY_LABELS,
  inferRoleFromTitle,
} from '@/lib/contact-system/constants'
import type { DealParticipantData } from '@/hooks/useContactSystem'
import type { ParsedInput } from '@/lib/contact-system/smart-parser'

interface ContactsViewProps {
  dealId: string
  companyId: string | null
}

type CategoryFilter = 'ALL' | 'PROSPECT' | 'MANAGEMENT' | 'ADVISOR' | 'OTHER'

export function ContactsView({ dealId, companyId: _companyId }: ContactsViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)

  // Inline add state
  const [smartInput, setSmartInput] = useState('')
  const [parsed, setParsed] = useState<ParsedInput | null>(null)
  const [addCategory, setAddCategory] = useState<string>('PROSPECT')
  const [addDescription, setAddDescription] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const { participants, categoryCounts, isLoading, refresh, addParticipant } =
    useDealParticipants(dealId)

  // Derive selected participant from the live list so it stays fresh after refresh
  const selectedParticipant = useMemo(
    () => (selectedParticipantId ? participants.find(p => p.id === selectedParticipantId) ?? null : null),
    [selectedParticipantId, participants]
  )

  const _total = participants.length
  const categoryTotal =
    categoryCounts.PROSPECT + categoryCounts.MANAGEMENT + categoryCounts.ADVISOR + categoryCounts.OTHER

  // Client-side filter
  const filtered = useMemo(() => {
    let result = participants
    if (categoryFilter !== 'ALL') {
      result = result.filter(p => p.category === categoryFilter)
    }
    if (companyFilter) {
      result = result.filter(p => {
        const companyName =
          p.canonicalPerson.currentCompany?.name ??
          p.dealBuyer?.canonicalCompany?.name
        return companyName === companyFilter
      })
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => {
        const name = `${p.canonicalPerson.firstName} ${p.canonicalPerson.lastName}`.toLowerCase()
        const email = p.canonicalPerson.email?.toLowerCase() ?? ''
        const company = p.canonicalPerson.currentCompany?.name?.toLowerCase() ?? ''
        return name.includes(q) || email.includes(q) || company.includes(q)
      })
    }
    return result
  }, [participants, categoryFilter, companyFilter, searchQuery])

  const filterPills: { id: CategoryFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: categoryTotal },
    ...CONTACT_CATEGORIES.map(cat => ({
      id: cat as CategoryFilter,
      label: CONTACT_CATEGORY_LABELS[cat],
      count: categoryCounts[cat],
    })),
  ]

  // Smart paste handler
  const handleParsed = useCallback((result: ParsedInput) => {
    setParsed(result)
    setAddError(null)

    // First, check if the parsed company matches an existing participant's company
    // If so, inherit that participant's category
    if (result.companies.length > 0 && result.companies[0].name) {
      const parsedCompanyName = result.companies[0].name.toLowerCase()
      // Find the most recently added participant from the same company
      const matchingParticipant = [...participants]
        .reverse()
        .find(p => {
          const companyName =
            p.canonicalPerson.currentCompany?.name ??
            p.dealBuyer?.canonicalCompany?.name
          return companyName?.toLowerCase() === parsedCompanyName
        })
      if (matchingParticipant?.category) {
        setAddCategory(matchingParticipant.category)
        return
      }
    }

    // Auto-infer category from title
    if (result.people.length > 0 && result.people[0].title) {
      const role = inferRoleFromTitle(result.people[0].title)
      if (role) {
        const advisorRoles = ['CPA', 'ATTORNEY', 'BROKER', 'MA_ADVISOR', 'WEALTH_PLANNER']
        const mgmtRoles = ['COO', 'CFO', 'GM', 'KEY_EMPLOYEE', 'BOARD_MEMBER', 'DECISION_MAKER']
        if (advisorRoles.includes(role)) setAddCategory('ADVISOR')
        else if (mgmtRoles.includes(role)) setAddCategory('MANAGEMENT')
        else setAddCategory('PROSPECT')
        return
      }
    }

    // Default to Prospect if no title-based inference
    setAddCategory('PROSPECT')
  }, [participants])

  // Add contact from smart paste
  const handleAddFromPaste = async () => {
    if (!parsed?.people[0]) return

    const person = parsed.people[0]

    // Validate required fields before making API calls
    if (!person.firstName?.trim() || !person.lastName?.trim()) {
      setAddError('Could not detect a first and last name. Please check the input.')
      return
    }

    setIsAdding(true)
    setAddError(null)

    try {
      // Create company if parsed
      let currentCompanyId: string | undefined
      if (parsed.companies[0]) {
        const companyRes = await fetch('/api/canonical/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: parsed.companies[0].name,
            website: parsed.companies[0].website,
            linkedInUrl: parsed.companies[0].linkedInUrl,
          }),
        })
        if (companyRes.ok) {
          const companyData = await companyRes.json()
          currentCompanyId = companyData.company.id
        } else {
          // Handle 409 (duplicate) and 400 (domain conflict)
          try {
            const errData = await companyRes.json()
            currentCompanyId =
              errData.matchResult?.matchedEntity?.id ||
              errData.existingDomains?.[0]?.companyId
          } catch { /* ignore */ }
        }
      }

      // Create canonical person
      const personRes = await fetch('/api/canonical/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email || undefined,
          phoneWork: person.phoneWork || person.phone || undefined,
          phoneCell: person.phoneCell || undefined,
          currentTitle: person.title || undefined,
          linkedInUrl: person.linkedInUrl || undefined,
          currentCompanyId,
          addressLine1: person.addressLine1 || undefined,
          addressLine2: person.addressLine2 || undefined,
          city: person.city || undefined,
          state: person.state || undefined,
          zip: person.zip || undefined,
        }),
      })

      let canonicalPersonId: string
      if (personRes.ok) {
        const data = await personRes.json()
        canonicalPersonId = data.person.id
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any = null
        try { data = await personRes.json() } catch { /* not JSON */ }
        const existingId = data?.existingPerson?.id || data?.matchResult?.matchedEntity?.id
        if (existingId) {
          canonicalPersonId = existingId
          // Update existing person's company if we have one and they don't
          if (currentCompanyId) {
            await fetch(`/api/canonical/people/${existingId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ currentCompanyId }),
            }).catch(() => {})
          }
        } else {
          const details = data?.details?.map((d: { field: string; message: string }) => d.message).join(', ')
          throw new Error(details || data?.error || data?.message || 'Failed to create contact')
        }
      }

      // Add as participant
      await addParticipant({
        canonicalPersonId,
        category: addCategory,
        description: addDescription.trim() || undefined,
      })

      // Reset
      setSmartInput('')
      setParsed(null)
      setAddDescription('')
      setAddCategory('PROSPECT')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add contact')
    } finally {
      setIsAdding(false)
    }
  }

  // Add contact from search
  const handleSearchSelect = async (contact: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    currentTitle: string | null
    currentCompany?: { id: string; name: string } | null
  }) => {
    setIsAdding(true)
    setAddError(null)
    try {
      await addParticipant({
        canonicalPersonId: contact.id,
        category: addCategory,
        description: addDescription.trim() || undefined,
      })
      setAddDescription('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add contact')
    } finally {
      setIsAdding(false)
    }
  }

  const handleCompanyClick = (companyName: string) => {
    setCompanyFilter(companyName)
    setCategoryFilter('ALL')
  }

  const getCompanyName = (p: DealParticipantData) =>
    p.canonicalPerson.currentCompany?.name ?? p.dealBuyer?.canonicalCompany?.name ?? null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="animate-pulse text-sm">Loading contacts...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Inline Add Section */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <SmartInputField
          value={smartInput}
          onChange={setSmartInput}
          onParsed={handleParsed}
          placeholder="Paste email signature, LinkedIn URL, or contact info..."
          label="Add Contact"
          minRows={3}
        />

        {/* Detected preview */}
        {parsed && parsed.people.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs">Detected:</span>
            <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs">
              <User className="h-3 w-3" />
              {parsed.people[0].fullName}
            </span>
            {parsed.companies[0] && (
              <span className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs">
                <Building2 className="h-3 w-3" />
                {parsed.companies[0].name}
              </span>
            )}
            {parsed.people[0].title && (
              <span className="text-xs text-muted-foreground">
                {parsed.people[0].title}
              </span>
            )}
          </div>
        )}

        {/* Category + Description + Add */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Category radio */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Category</label>
            <div className="flex gap-1">
              {CONTACT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAddCategory(cat)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-md border transition-colors',
                    addCategory === cat
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  )}
                >
                  {CONTACT_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium">Description</label>
            <Input
              value={addDescription}
              onChange={e => setAddDescription(e.target.value)}
              placeholder="e.g. patents attorney, CPA, tax accountant..."
              className="h-8 text-sm"
            />
          </div>

          {/* Add button */}
          <Button
            size="sm"
            onClick={handleAddFromPaste}
            disabled={isAdding || !parsed?.people?.length}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Submit'
            )}
          </Button>
        </div>

        {addError && (
          <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
        )}

        {/* Or search existing */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">- or search existing contacts -</p>
          <ContactSearch
            onSelect={handleSearchSelect}
            excludeIds={participants.map(p => p.canonicalPerson.id)}
            placeholder="Search contacts by name or email..."
          />
        </div>
      </div>

      {/* Filter pills + Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 flex-wrap">
            {filterPills.map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => { setCategoryFilter(pill.id); setCompanyFilter(null) }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                  categoryFilter === pill.id && !companyFilter
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {pill.label}
                {pill.count > 0 && (
                  <span className="ml-1 text-[10px] opacity-70">({pill.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Company filter chip */}
        {companyFilter && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtered by:</span>
            <button
              type="button"
              onClick={() => setCompanyFilter(null)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <Building2 className="h-3 w-3" />
              {companyFilter}
              <X className="h-3 w-3 ml-0.5" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by name, email, or company..."
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Empty state */}
      {categoryTotal === 0 && (
        <div className="text-center py-16">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No contacts yet</p>
          <p className="text-xs text-muted-foreground/70">
            Paste an email signature or LinkedIn profile above to add your first contact
          </p>
        </div>
      )}

      {/* Table */}
      {categoryTotal > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Title</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Description</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Phones</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const companyName = getCompanyName(p)
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedParticipantId(p.id)}
                    className={cn(
                      'border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/30',
                      !p.isActive && 'opacity-50'
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {p.canonicalPerson.firstName} {p.canonicalPerson.lastName}
                        </span>
                        {p.isPrimary && (
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Primary
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {companyName ? (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleCompanyClick(companyName) }}
                          className="text-primary hover:underline text-xs"
                        >
                          {companyName}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {p.canonicalPerson.currentTitle ?? '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <CategoryBadge category={p.category ?? 'OTHER'} />
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {p.description ?? '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {(p.canonicalPerson.phoneWork || p.canonicalPerson.phone) && (
                          <div>{p.canonicalPerson.phoneWork || p.canonicalPerson.phone}</div>
                        )}
                        {p.canonicalPerson.phoneCell && (
                          <div className="text-muted-foreground/70">{p.canonicalPerson.phoneCell}</div>
                        )}
                        {!p.canonicalPerson.phoneWork && !p.canonicalPerson.phone && !p.canonicalPerson.phoneCell && '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      {p.canonicalPerson.email ? (
                        <a
                          href={`mailto:${p.canonicalPerson.email}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-primary hover:underline"
                        >
                          {p.canonicalPerson.email}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery
                ? `No contacts match "${searchQuery}"`
                : companyFilter
                  ? `No contacts at ${companyFilter}`
                  : 'No contacts in this category'}
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      {selectedParticipant && (
        <ParticipantDetailPanel
          participant={selectedParticipant}
          dealId={dealId}
          onClose={() => setSelectedParticipantId(null)}
          onUpdate={refresh}
        />
      )}
    </div>
  )
}
