'use client'

import { useState, useEffect, useCallback } from 'react'

// ============================================
// TYPES
// ============================================

export interface DealBuyer {
  id: string
  companyName: string
  companyType: string
  currentStage: string
  approvalStatus: string
  tier: string
  addedDate: string
  lastActivityDate: string | null
  hasNDA: boolean
  hasCIM: boolean
  hasIOI: boolean
  hasLOI: boolean
  progressPercent: number
  canonicalCompany?: {
    id: string
    name: string
    website: string | null
    industryName: string | null
    headquarters: string | null
  }
}

export interface DealContact {
  id: string
  canonicalPerson: {
    id: string
    name: string
    email: string | null
    phone: string | null
    title: string | null
    linkedInUrl: string | null
  }
  role: string
  isPrimary: boolean
  isActive: boolean
}

export interface Activity {
  id: string
  activityType: string
  subject: string
  description: string | null
  performedAt: string
  performedByUserId: string
  metadata: Record<string, unknown> | null
}

interface FetchState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

// ============================================
// UTILITY HOOK
// ============================================

function useFetch<T>(url: string | null): FetchState<T> & { refresh: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    // Skip fetching when no URL - return values handled below
    if (!url) {
      return
    }

    let cancelled = false

    const doFetch = async () => {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Fetch failed')
        const fetchedData = await res.json()
        if (!cancelled) {
          setData(fetchedData)
          setIsLoading(false)
        }
      } catch (fetchError) {
        if (!cancelled) {
          setData(null)
          setIsLoading(false)
          setError(fetchError as Error)
        }
      }
    }

    setIsLoading(true)
    setError(null)
    doFetch()

    return () => {
      cancelled = true
    }
  }, [url, refreshCount])

  const refresh = useCallback(() => {
    setRefreshCount(prev => prev + 1)
  }, [])

  // Return empty state when no URL (avoids setState in effect)
  if (!url) {
    return { data: null, isLoading: false, error: null, refresh }
  }

  return { data, isLoading, error, refresh }
}

// ============================================
// DEAL HOOKS
// ============================================

/**
 * Hook to manage deal buyers
 */
export function useDealBuyers(dealId: string) {
  const { data, isLoading, error, refresh } = useFetch<{ buyers: DealBuyer[] }>(
    dealId ? `/api/deals/${dealId}/buyers` : null
  )

  const approveBuyer = useCallback(async (buyerId: string, status: string, note?: string) => {
    const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    })

    if (!res.ok) throw new Error('Failed to update approval status')

    refresh()
    return res.json()
  }, [dealId, refresh])

  const bulkApprove = useCallback(async (buyerIds: string[], status: string, note?: string) => {
    const res = await fetch(`/api/deals/${dealId}/buyers/bulk-approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerIds, status, note }),
    })

    if (!res.ok) throw new Error('Failed to bulk approve')

    refresh()
    return res.json()
  }, [dealId, refresh])

  const updateStage = useCallback(async (buyerId: string, toStage: string, note?: string) => {
    const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStage, note }),
    })

    if (!res.ok) throw new Error('Failed to update stage')

    refresh()
    return res.json()
  }, [dealId, refresh])

  return {
    buyers: data?.buyers ?? [],
    isLoading,
    error,
    refresh,
    approveBuyer,
    bulkApprove,
    updateStage,
  }
}

/**
 * Hook to manage a single buyer
 */
export function useBuyer(dealId: string, buyerId: string) {
  const { data, isLoading, error, refresh } = useFetch<DealBuyer>(
    dealId && buyerId ? `/api/deals/${dealId}/buyers/${buyerId}` : null
  )

  return {
    buyer: data,
    isLoading,
    error,
    refresh,
  }
}

/**
 * Hook to manage buyer contacts
 */
export function useBuyerContacts(dealId: string, buyerId: string) {
  const { data, isLoading, error, refresh } = useFetch<{ contacts: DealContact[] }>(
    dealId && buyerId ? `/api/deals/${dealId}/buyers/${buyerId}/contacts` : null
  )

  const addContact = useCallback(async (personId: string, role: string, isPrimary: boolean) => {
    const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, role, isPrimary }),
    })

    if (!res.ok) throw new Error('Failed to add contact')

    refresh()
    return res.json()
  }, [dealId, buyerId, refresh])

  const updateContact = useCallback(async (contactId: string, updates: Partial<DealContact>) => {
    const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!res.ok) throw new Error('Failed to update contact')

    refresh()
    return res.json()
  }, [dealId, buyerId, refresh])

  const removeContact = useCallback(async (contactId: string) => {
    const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/contacts/${contactId}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error('Failed to remove contact')

    refresh()
  }, [dealId, buyerId, refresh])

  return {
    contacts: data?.contacts ?? [],
    isLoading,
    error,
    refresh,
    addContact,
    updateContact,
    removeContact,
  }
}

/**
 * Hook to manage buyer activities
 */
export function useBuyerActivities(dealId: string, buyerId: string) {
  const { data, isLoading, error, refresh } = useFetch<{ activities: Activity[] }>(
    dealId && buyerId ? `/api/deals/${dealId}/buyers/${buyerId}/activities` : null
  )

  const logActivity = useCallback(async (
    activityType: string,
    subject: string,
    description?: string,
    metadata?: Record<string, unknown>
  ) => {
    const res = await fetch(`/api/deals/${dealId}/buyers/${buyerId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityType, subject, description, metadata }),
    })

    if (!res.ok) throw new Error('Failed to log activity')

    refresh()
    return res.json()
  }, [dealId, buyerId, refresh])

  return {
    activities: data?.activities ?? [],
    isLoading,
    error,
    refresh,
    logActivity,
  }
}

// ============================================
// DEAL PARTICIPANTS HOOK
// ============================================

export interface DealParticipantData {
  id: string
  dealId: string
  dealBuyerId: string | null
  side: string
  role: string
  isPrimary: boolean
  isActive: boolean
  vdrAccessLevel: string | null
  createdAt: string
  canonicalPerson: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    currentTitle: string | null
    linkedInUrl: string | null
    currentCompany?: { id: string; name: string } | null
  }
  dealBuyer?: {
    id: string
    canonicalCompany: { id: string; name: string }
  } | null
}

interface ParticipantCounts {
  BUYER: number
  SELLER: number
  NEUTRAL: number
}

/**
 * Hook to manage deal participants (unified contacts)
 */
export function useDealParticipants(dealId: string | null, sideFilter?: string) {
  const queryParams = sideFilter ? `?side=${sideFilter}` : ''
  const { data, isLoading, error, refresh } = useFetch<{
    participants: DealParticipantData[]
    total: number
    counts: ParticipantCounts
  }>(dealId ? `/api/deals/${dealId}/participants${queryParams}` : null)

  const addParticipant = useCallback(async (params: {
    canonicalPersonId: string
    side: string
    role: string
    dealBuyerId?: string | null
    isPrimary?: boolean
  }) => {
    const res = await fetch(`/api/deals/${dealId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to add participant')
    }

    refresh()
    return res.json()
  }, [dealId, refresh])

  const updateParticipant = useCallback(async (
    participantId: string,
    updates: { role?: string; side?: string; isPrimary?: boolean; isActive?: boolean; dealBuyerId?: string | null }
  ) => {
    const res = await fetch(`/api/deals/${dealId}/participants/${participantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!res.ok) throw new Error('Failed to update participant')

    refresh()
    return res.json()
  }, [dealId, refresh])

  const removeParticipant = useCallback(async (participantId: string) => {
    const res = await fetch(`/api/deals/${dealId}/participants/${participantId}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error('Failed to remove participant')

    refresh()
  }, [dealId, refresh])

  const smartAdd = useCallback(async (text: string) => {
    const res = await fetch(`/api/deals/${dealId}/participants/smart-add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) throw new Error('Failed to parse input')

    return res.json()
  }, [dealId])

  return {
    participants: data?.participants ?? [],
    total: data?.total ?? 0,
    counts: data?.counts ?? { BUYER: 0, SELLER: 0, NEUTRAL: 0 },
    isLoading,
    error,
    refresh,
    addParticipant,
    updateParticipant,
    removeParticipant,
    smartAdd,
  }
}

// ============================================
// ANALYTICS HOOKS
// ============================================

/**
 * Hook to fetch deal analytics
 */
export function useDealAnalytics(dealId: string) {
  const funnel = useFetch(dealId ? `/api/deals/${dealId}/analytics/funnel` : null)
  const mix = useFetch(dealId ? `/api/deals/${dealId}/analytics/buyer-mix` : null)
  const time = useFetch(dealId ? `/api/deals/${dealId}/analytics/time-in-stage` : null)
  const exits = useFetch(dealId ? `/api/deals/${dealId}/analytics/exits` : null)

  const refreshAll = useCallback(() => {
    funnel.refresh()
    mix.refresh()
    time.refresh()
    exits.refresh()
  }, [funnel, mix, time, exits])

  return {
    funnel: funnel.data,
    buyerMix: mix.data,
    timeInStage: time.data,
    exits: exits.data,
    isLoading: funnel.isLoading || mix.isLoading || time.isLoading || exits.isLoading,
    errors: {
      funnel: funnel.error,
      mix: mix.error,
      time: time.error,
      exits: exits.error,
    },
    refreshAll,
  }
}

// ============================================
// SEARCH HOOKS
// ============================================

/**
 * Hook for searching contacts/companies with debouncing
 */
export function useContactSearch(query: string, options?: { debounceMs?: number }) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, options?.debounceMs ?? 300)

    return () => clearTimeout(timer)
  }, [query, options?.debounceMs])

  const { data, isLoading, error } = useFetch<{ companies: unknown[]; people: unknown[] }>(
    debouncedQuery.length >= 2
      ? `/api/contact-system/search?q=${encodeURIComponent(debouncedQuery)}`
      : null
  )

  return {
    results: data ?? { companies: [], people: [] },
    isLoading: isLoading && debouncedQuery.length >= 2,
    error,
    isSearching: query !== debouncedQuery,
  }
}

// ============================================
// MIGRATION HOOKS
// ============================================

/**
 * Hook for migration operations
 */
export function useMigration(dealId: string) {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<{
    phase: string
    current: number
    total: number
    message?: string
  } | null>(null)

  const { data: validation, refresh: revalidate } = useFetch<{
    isReady: boolean
    issues: Array<{ severity: string; type: string; message: string }>
  }>(dealId ? `/api/deals/${dealId}/migrate` : null)

  const runMigration = useCallback(async (options?: { dryRun?: boolean }) => {
    setIsRunning(true)
    setProgress({ phase: 'starting', current: 0, total: 1, message: 'Starting migration...' })

    try {
      const res = await fetch(`/api/deals/${dealId}/migrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      })

      if (!res.ok) throw new Error('Migration failed')

      const result = await res.json()
      revalidate()
      return result
    } finally {
      setIsRunning(false)
      setProgress(null)
    }
  }, [dealId, revalidate])

  const rollback = useCallback(async (options?: { dryRun?: boolean }) => {
    const res = await fetch(`/api/deals/${dealId}/migrate?dryRun=${options?.dryRun ?? false}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error('Rollback failed')

    revalidate()
    return res.json()
  }, [dealId, revalidate])

  return {
    isReady: validation?.isReady ?? false,
    issues: validation?.issues ?? [],
    isRunning,
    progress,
    runMigration,
    rollback,
    revalidate,
  }
}

// ============================================
// TOAST/NOTIFICATION HOOK
// ============================================

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

/**
 * Simple toast notification hook
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = Math.random().toString(36).substring(7)
    const toast: Toast = { id, type, message, duration }

    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message: string) => addToast('success', message), [addToast])
  const error = useCallback((message: string) => addToast('error', message), [addToast])
  const info = useCallback((message: string) => addToast('info', message), [addToast])
  const warning = useCallback((message: string) => addToast('warning', message), [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  }
}
