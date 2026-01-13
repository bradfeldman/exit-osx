'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Company {
  id: string
  name: string
}

interface CompanyContextType {
  companies: Company[]
  selectedCompanyId: string | null
  selectedCompany: Company | null
  setSelectedCompanyId: (id: string) => void
  isLoading: boolean
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadCompanies() {
      try {
        const response = await fetch('/api/companies')
        if (response.ok) {
          const data = await response.json()
          const companyList = data.companies || []
          setCompanies(companyList)

          // Check localStorage for previously selected company
          const storedId = localStorage.getItem('selectedCompanyId')
          if (storedId && companyList.some((c: Company) => c.id === storedId)) {
            setSelectedCompanyIdState(storedId)
          } else if (companyList.length > 0) {
            setSelectedCompanyIdState(companyList[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to load companies:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCompanies()
  }, [])

  const setSelectedCompanyId = (id: string) => {
    setSelectedCompanyIdState(id)
    localStorage.setItem('selectedCompanyId', id)
  }

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompanyId,
        selectedCompany,
        setSelectedCompanyId,
        isLoading,
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
