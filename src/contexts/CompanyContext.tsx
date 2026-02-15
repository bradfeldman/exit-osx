'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type UserCompanyRole = 'subscribing_owner' | 'owner' | 'staff'

interface Company {
  id: string
  name: string
  role?: UserCompanyRole
  isSubscribingOwner?: boolean
  ownershipPercent?: number
}

interface CompanyContextType {
  companies: Company[]
  selectedCompanyId: string | null
  selectedCompany: Company | null
  selectedCompanyRole: UserCompanyRole | null
  isSelectedCompanyOwner: boolean
  isSelectedCompanySubscribingOwner: boolean
  setSelectedCompanyId: (id: string | null) => void
  isLoading: boolean
  loadError: boolean
  refreshCompanies: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadCompanies = async (preserveSelection = false) => {
    setIsLoading(true)
    setLoadError(false)

    const MAX_RETRIES = 2
    let lastError: unknown = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch('/api/companies')
        if (response.ok) {
          const data = await response.json()
          const companyList = (data.companies || []).sort((a: Company, b: Company) =>
            a.name.localeCompare(b.name)
          )
          setCompanies(companyList)

          // Only auto-select if not preserving current selection
          if (!preserveSelection) {
            // Check localStorage for previously selected company
            const storedId = localStorage.getItem('selectedCompanyId')
            if (storedId && companyList.some((c: Company) => c.id === storedId)) {
              setSelectedCompanyIdState(storedId)
            } else if (companyList.length > 0) {
              setSelectedCompanyIdState(companyList[0].id)
            }
          } else {
            // When preserving selection, verify the selected company still exists
            const currentId = localStorage.getItem('selectedCompanyId')
            if (currentId && companyList.some((c: Company) => c.id === currentId)) {
              setSelectedCompanyIdState(currentId)
            } else if (companyList.length > 0) {
              // Fallback to first company if current selection no longer exists
              setSelectedCompanyIdState(companyList[0].id)
              localStorage.setItem('selectedCompanyId', companyList[0].id)
            }
          }
          setIsLoading(false)
          return // Success — exit early
        }

        // Non-200 response — retry if attempts remain
        lastError = new Error(`API returned ${response.status}`)
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error) {
        lastError = error
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    // All retries exhausted
    console.error('Failed to load companies after retries:', lastError)
    setLoadError(true)
    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetching pattern
    loadCompanies()
  }, [])

  const setSelectedCompanyId = (id: string | null) => {
    setSelectedCompanyIdState(id)
    if (id) {
      localStorage.setItem('selectedCompanyId', id)
    } else {
      localStorage.removeItem('selectedCompanyId')
    }
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null
  const selectedCompanyRole = selectedCompany?.role || null
  const isSelectedCompanyOwner = selectedCompanyRole === 'subscribing_owner' || selectedCompanyRole === 'owner'
  const isSelectedCompanySubscribingOwner = selectedCompanyRole === 'subscribing_owner'

  const refreshCompanies = async () => {
    // Preserve the current selection when refreshing
    await loadCompanies(true)
  }

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompanyId,
        selectedCompany,
        selectedCompanyRole,
        isSelectedCompanyOwner,
        isSelectedCompanySubscribingOwner,
        setSelectedCompanyId,
        isLoading,
        loadError,
        refreshCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}
