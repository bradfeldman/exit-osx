'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/lib/motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCompany } from '@/contexts/CompanyContext'
import { useProgression } from '@/contexts/ProgressionContext'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Lock,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  Save,
  Building2,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  ChevronDown,
  User,
  Target,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

// Animation variants for row animations
const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 }
  },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
}

interface ValuationSnapshot {
  id: string
  currentValue: string | number
  potentialValue: string | number
  briScore: string | number
}

interface Company {
  id: string
  name: string
  valuationSnapshots: ValuationSnapshot[]
}

interface BusinessAsset {
  companyId: string
  companyName: string
  marketValue: number
  ownershipPercent: number
  netValue: number
}

interface PersonalAsset {
  id: string
  category: string
  description: string
  value: number
}

interface PersonalLiability {
  id: string
  category: string
  description: string
  amount: number
}

const ASSET_CATEGORIES = [
  'Real Estate',
  'Vehicles',
  'Retirement Accounts',
  'Investment Accounts',
  'Cash & Savings',
  'Other Assets',
]

const LIABILITY_CATEGORIES = [
  'Mortgage',
  'Auto Loans',
  'Student Loans',
  'Credit Cards',
  'Personal Loans',
  'Other Liabilities',
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatInputValue(value: number): string {
  if (value === 0) return ''
  return new Intl.NumberFormat('en-US').format(value)
}

function parseInputValue(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  return parseFloat(cleaned) || 0
}

// Parse percentage with 2 decimal places
function parsePercentage(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned) || 0
  return Math.min(100, Math.max(0, num))
}

// Format percentage for display in input
function formatPercentage(value: number): string {
  if (value === 0) return ''
  // Round to 2 decimal places
  return (Math.round(value * 100) / 100).toString()
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = true,
  action,
}: {
  title: string
  description?: string
  icon: typeof Building2
  children: React.ReactNode
  defaultOpen?: boolean
  action?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className="overflow-hidden border-border/50">
      {/* Custom header - not using CardHeader to avoid grid layout conflicts */}
      <div className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-muted/30 transition-colors">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
          className="flex items-center gap-3 flex-1"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold font-display leading-none">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsOpen(!isOpen)}
            onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>
      {isOpen && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

export default function PersonalFinancialStatementPage() {
  const { selectedCompanyId } = useCompany()
  const { refetch: refetchProgression } = useProgression()
  const { hasPermission, isLoading: permissionsLoading } = usePermissions({ companyId: selectedCompanyId || undefined })
  const [_companies, setCompanies] = useState<Company[]>([])
  const [businessAssets, setBusinessAssets] = useState<BusinessAsset[]>([])
  const [personalAssets, setPersonalAssets] = useState<PersonalAsset[]>([])
  const [personalLiabilities, setPersonalLiabilities] = useState<PersonalLiability[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [savedSuccessfully, setSavedSuccessfully] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [currentAge, setCurrentAge] = useState<number | null>(null)
  const [retirementAge, setRetirementAge] = useState<number | null>(null)
  const [exitGoalAmount, setExitGoalAmount] = useState<number>(0)

  // Track original state for dirty checking
  const [originalState, setOriginalState] = useState<{
    personalAssets: PersonalAsset[]
    personalLiabilities: PersonalLiability[]
    businessOwnership: Record<string, number>
    currentAge: number | null
    retirementAge: number | null
    exitGoalAmount: number
  } | null>(null)

  // Check permissions
  const canViewPersonal = hasPermission('personal.retirement:view') || hasPermission('personal.net_worth:view')
  const canEditPersonal = hasPermission('personal.retirement:edit') || hasPermission('personal.net_worth:edit')

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!originalState) return false

    // Check personal assets
    if (JSON.stringify(personalAssets) !== JSON.stringify(originalState.personalAssets)) {
      return true
    }

    // Check personal liabilities
    if (JSON.stringify(personalLiabilities) !== JSON.stringify(originalState.personalLiabilities)) {
      return true
    }

    // Check business ownership
    const currentOwnership: Record<string, number> = {}
    businessAssets.forEach(a => {
      currentOwnership[a.companyId] = a.ownershipPercent
    })
    if (JSON.stringify(currentOwnership) !== JSON.stringify(originalState.businessOwnership)) {
      return true
    }

    // Check owner profile fields
    if (currentAge !== originalState.currentAge) return true
    if (retirementAge !== originalState.retirementAge) return true
    if (exitGoalAmount !== originalState.exitGoalAmount) return true

    return false
  }, [personalAssets, personalLiabilities, businessAssets, originalState, currentAge, retirementAge, exitGoalAmount])

  // Load companies and saved data on mount
  useEffect(() => {
    async function loadAllData() {
      if (!permissionsLoading && canViewPersonal) {
        // Load personal financials first (if company selected)
        let loadedPersonalData = { assets: [] as PersonalAsset[], liabilities: [] as PersonalLiability[], currentAge: null as number | null, retirementAge: null as number | null, exitGoalAmount: 0, businessOwnership: null as Record<string, number> | null }
        if (selectedCompanyId) {
          loadedPersonalData = await loadPersonalFinancials(selectedCompanyId)
        }
        // Then load companies (which will set the complete original state)
        await loadCompaniesWithOriginalState(loadedPersonalData)
      }
    }
    loadAllData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoading, canViewPersonal, selectedCompanyId])

  // Save to database when data changes
  async function savePersonalFinancials() {
    if (!selectedCompanyId || !canEditPersonal) return

    setSaving(true)
    setSavedSuccessfully(false)
    setSaveError(null)
    try {
      // Save ownership percentages to localStorage
      const ownership: Record<string, number> = {}
      businessAssets.forEach(a => {
        ownership[a.companyId] = a.ownershipPercent
      })
      localStorage.setItem('pfs_businessOwnership', JSON.stringify(ownership))

      const response = await fetch(`/api/companies/${selectedCompanyId}/personal-financials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalAssets,
          personalLiabilities,
          netWorth: totalAssets - totalLiabilities,
          totalRetirement: personalAssets
            .filter(a => a.category === 'Retirement Accounts')
            .reduce((sum, a) => sum + a.value, 0),
          currentAge,
          retirementAge,
          exitGoalAmount: exitGoalAmount || null,
          businessOwnership: ownership,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to save personal financials:', response.status, errorData)
        throw new Error(errorData.error || `Save failed with status ${response.status}`)
      }

      // Update original state to current state
      setOriginalState({
        personalAssets: JSON.parse(JSON.stringify(personalAssets)),
        personalLiabilities: JSON.parse(JSON.stringify(personalLiabilities)),
        businessOwnership: ownership,
        currentAge,
        retirementAge,
        exitGoalAmount,
      })

      setLastSaved(new Date())
      setSavedSuccessfully(true)
      setTimeout(() => setSavedSuccessfully(false), 3000)

      // Refetch progression data to unlock features (e.g., Retirement Calculator)
      refetchProgression()
    } catch (error) {
      console.error('Failed to save personal financials:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function loadPersonalFinancials(companyId: string): Promise<{ assets: PersonalAsset[], liabilities: PersonalLiability[], currentAge: number | null, retirementAge: number | null, exitGoalAmount: number, businessOwnership: Record<string, number> | null }> {
    try {
      const response = await fetch(`/api/companies/${companyId}/personal-financials`)
      if (response.ok) {
        const data = await response.json()
        if (data.personalFinancials) {
          const loadedAssets = data.personalFinancials.personalAssets || []
          const loadedLiabilities = data.personalFinancials.personalLiabilities || []
          const loadedCurrentAge = data.personalFinancials.currentAge ?? null
          const loadedRetirementAge = data.personalFinancials.retirementAge ?? null
          const loadedExitGoal = data.personalFinancials.exitGoalAmount ? Number(data.personalFinancials.exitGoalAmount) : 0
          const loadedOwnership = data.personalFinancials.businessOwnership ?? null
          setPersonalAssets(loadedAssets)
          setPersonalLiabilities(loadedLiabilities)
          setCurrentAge(loadedCurrentAge)
          setRetirementAge(loadedRetirementAge)
          setExitGoalAmount(loadedExitGoal)
          return { assets: loadedAssets, liabilities: loadedLiabilities, currentAge: loadedCurrentAge, retirementAge: loadedRetirementAge, exitGoalAmount: loadedExitGoal, businessOwnership: loadedOwnership }
        }
      }
    } catch (error) {
      console.error('Failed to load personal financials:', error)
      loadSavedDataFromLocalStorage()
    }
    return { assets: [], liabilities: [], currentAge: null, retirementAge: null, exitGoalAmount: 0, businessOwnership: null }
  }

  function loadSavedDataFromLocalStorage() {
    try {
      const savedAssets = localStorage.getItem('pfs_personalAssets')
      const savedLiabilities = localStorage.getItem('pfs_personalLiabilities')
      if (savedAssets) setPersonalAssets(JSON.parse(savedAssets))
      if (savedLiabilities) setPersonalLiabilities(JSON.parse(savedLiabilities))
    } catch (error) {
      console.error('Failed to load saved PFS data:', error)
    }
  }

  async function loadCompaniesWithOriginalState(personalData: { assets: PersonalAsset[], liabilities: PersonalLiability[], currentAge: number | null, retirementAge: number | null, exitGoalAmount: number, businessOwnership: Record<string, number> | null }) {
    setLoading(true)
    try {
      const response = await fetch('/api/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])

        // Load ownership: DB first, localStorage fallback
        let savedOwnership: Record<string, number> = {}
        if (personalData.businessOwnership && Object.keys(personalData.businessOwnership).length > 0) {
          savedOwnership = personalData.businessOwnership
        } else {
          try {
            const saved = localStorage.getItem('pfs_businessOwnership')
            if (saved) savedOwnership = JSON.parse(saved)
          } catch {
            // Ignore parse errors
          }
        }

        // Fetch current calculated value from dashboard API for each company
        const assets: BusinessAsset[] = await Promise.all(
          (data.companies || []).map(async (company: Company) => {
            let marketValue = 0

            try {
              const dashboardRes = await fetch(`/api/companies/${company.id}/dashboard`)
              if (dashboardRes.ok) {
                const dashboardData = await dashboardRes.json()
                marketValue = dashboardData.tier1?.currentValue || 0
              }
            } catch {
              const latestSnapshot = company.valuationSnapshots?.[0]
              marketValue = latestSnapshot ? Number(latestSnapshot.currentValue) : 0
            }

            const ownershipPercent = savedOwnership[company.id] ?? 100
            return {
              companyId: company.id,
              companyName: company.name,
              marketValue,
              ownershipPercent,
              netValue: marketValue * (ownershipPercent / 100),
            }
          })
        )
        setBusinessAssets(assets)

        // Set original state with ALL data at once
        const ownership: Record<string, number> = {}
        assets.forEach(a => {
          ownership[a.companyId] = a.ownershipPercent
        })
        setOriginalState({
          personalAssets: JSON.parse(JSON.stringify(personalData.assets)),
          personalLiabilities: JSON.parse(JSON.stringify(personalData.liabilities)),
          businessOwnership: ownership,
          currentAge: personalData.currentAge,
          retirementAge: personalData.retirementAge,
          exitGoalAmount: personalData.exitGoalAmount,
        })
      }
    } catch (error) {
      console.error('Failed to load companies:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleOwnershipChange(companyId: string, value: string) {
    const percent = parsePercentage(value)
    setBusinessAssets(prev =>
      prev.map(asset => {
        if (asset.companyId === companyId) {
          return {
            ...asset,
            ownershipPercent: percent,
            netValue: asset.marketValue * (percent / 100),
          }
        }
        return asset
      })
    )
  }

  function addPersonalAsset() {
    setPersonalAssets(prev => [
      ...prev,
      {
        id: `asset-${Date.now()}`,
        category: ASSET_CATEGORIES[0],
        description: '',
        value: 0,
      },
    ])
  }

  function updatePersonalAsset(id: string, field: keyof PersonalAsset, value: string | number) {
    setPersonalAssets(prev =>
      prev.map(asset =>
        asset.id === id ? { ...asset, [field]: value } : asset
      )
    )
  }

  function removePersonalAsset(id: string) {
    setPersonalAssets(prev => prev.filter(asset => asset.id !== id))
  }

  function addPersonalLiability() {
    setPersonalLiabilities(prev => [
      ...prev,
      {
        id: `liability-${Date.now()}`,
        category: LIABILITY_CATEGORIES[0],
        description: '',
        amount: 0,
      },
    ])
  }

  function updatePersonalLiability(id: string, field: keyof PersonalLiability, value: string | number) {
    setPersonalLiabilities(prev =>
      prev.map(liability =>
        liability.id === id ? { ...liability, [field]: value } : liability
      )
    )
  }

  function removePersonalLiability(id: string) {
    setPersonalLiabilities(prev => prev.filter(liability => liability.id !== id))
  }

  // Calculate totals
  const totalBusinessAssets = businessAssets.reduce((sum, asset) => sum + asset.netValue, 0)
  const totalPersonalAssets = personalAssets.reduce((sum, asset) => sum + asset.value, 0)
  const totalAssets = totalBusinessAssets + totalPersonalAssets
  const totalLiabilities = personalLiabilities.reduce((sum, liability) => sum + liability.amount, 0)
  const netWorth = totalAssets - totalLiabilities

  // Loading state
  if (permissionsLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="mx-auto mb-4"
          >
            <Loader2 className="h-10 w-10 text-primary" />
          </motion.div>
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </motion.div>
    )
  }

  // Permission denied view
  if (!canViewPersonal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Personal Financial Statement</h1>
          <p className="text-muted-foreground mt-1">Track your personal assets, liabilities, and net worth</p>
        </div>
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted mb-4 flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You don&apos;t have permission to view personal financial information.
              Contact your organization administrator if you need access.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Data loading state - skeleton UI
  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-80 bg-muted rounded-lg" />
            <div className="h-5 w-64 bg-muted rounded mt-2" />
          </div>
          <div className="h-10 w-32 bg-muted rounded-lg" />
        </div>

        {/* Net Worth Summary skeleton */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center p-4 rounded-xl bg-background/50">
                  <div className="h-4 w-24 bg-muted rounded mx-auto mb-3" />
                  <div className="h-10 w-32 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section skeletons */}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/50">
            <div className="flex items-center gap-3 p-6">
              <div className="h-10 w-10 bg-muted rounded-lg" />
              <div>
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="h-4 w-64 bg-muted rounded mt-2" />
              </div>
            </div>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {[1, 2].map((j) => (
                  <div key={j} className="h-12 bg-muted/50 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">
            Personal Financial Statement
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your personal assets, liabilities, and net worth
          </p>
        </div>
        {canEditPersonal && (
          <div className="flex items-center gap-3">
            {saveError && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-sm text-red-600 max-w-xs"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{saveError}</span>
              </motion.div>
            )}
            {savedSuccessfully && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-sm text-green-600"
              >
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </motion.div>
            )}
            {lastSaved && !savedSuccessfully && !saveError && (
              <span className="text-xs text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={savePersonalFinancials}
              disabled={saving || !hasUnsavedChanges}
              className={hasUnsavedChanges ? 'shadow-lg shadow-primary/20' : ''}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Read-only warning */}
      {!canEditPersonal && (
        <div>
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <CardContent className="flex items-center gap-3 py-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                You have view-only access to this page. Contact your administrator to request edit permissions.
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Net Worth Summary */}
      <div>
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-xl bg-background/50">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                </div>
                <p className="text-3xl font-bold font-display text-green-600">
                  {formatCurrency(totalAssets)}
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-background/50">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <p className="text-sm font-medium text-muted-foreground">Total Liabilities</p>
                </div>
                <p className="text-3xl font-bold font-display text-red-500">
                  {formatCurrency(totalLiabilities)}
                </p>
              </div>
              <div className="text-center p-4 rounded-xl bg-background/50">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Net Worth</p>
                </div>
                <p className={`text-3xl font-bold font-display ${netWorth >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {formatCurrency(netWorth)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owner Profile */}
      <div>
        <CollapsibleSection
          title="Owner Profile"
          description="Your age, retirement target, and exit goals"
          icon={User}
          defaultOpen={!!(currentAge || retirementAge || exitGoalAmount)}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Current Age</label>
              <Input
                type="text"
                inputMode="numeric"
                value={currentAge !== null ? String(currentAge) : ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  if (!v) { setCurrentAge(null); return }
                  setCurrentAge(Math.min(100, Math.max(18, parseInt(v))))
                }}
                placeholder="e.g. 52"
                className="h-9"
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Target Retirement Age</label>
              <Input
                type="text"
                inputMode="numeric"
                value={retirementAge !== null ? String(retirementAge) : ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, '')
                  if (!v) { setRetirementAge(null); return }
                  const minAge = currentAge ? currentAge + 1 : 19
                  setRetirementAge(Math.min(100, Math.max(minAge, parseInt(v))))
                }}
                placeholder="e.g. 65"
                className="h-9"
                disabled={!canEditPersonal}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Exit Goal</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatInputValue(exitGoalAmount)}
                  onChange={(e) => setExitGoalAmount(parseInputValue(e.target.value))}
                  placeholder="0"
                  className="pl-7 text-right h-9"
                  disabled={!canEditPersonal}
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Business Assets */}
      <div>
        <CollapsibleSection
          title="Business Interests"
          description="Your ownership stake in businesses (values from Scorecard)"
          icon={Building2}
        >
          {businessAssets.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No businesses found in your account.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b border-border">
                <div className="col-span-4">Business Name</div>
                <div className="col-span-3 text-right">Market Value</div>
                <div className="col-span-2 text-center">Ownership %</div>
                <div className="col-span-3 text-right">Your Value</div>
              </div>

              {/* Business rows */}
              <AnimatePresence>
                {businessAssets.map(asset => (
                  <motion.div
                    key={asset.companyId}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="grid grid-cols-12 gap-4 items-center py-3 border-b border-border/50 hover:bg-muted/30 transition-colors rounded-lg px-2 -mx-2"
                  >
                    <div className="col-span-4">
                      <p className="font-medium text-foreground">{asset.companyName}</p>
                    </div>
                    <div className="col-span-3 text-right text-muted-foreground">
                      {formatCurrency(asset.marketValue)}
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-center gap-1">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={formatPercentage(asset.ownershipPercent)}
                          onChange={(e) => handleOwnershipChange(asset.companyId, e.target.value)}
                          placeholder="100"
                          className="w-20 text-center h-9"
                          disabled={!canEditPersonal}
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                    <div className="col-span-3 text-right font-semibold text-foreground">
                      {formatCurrency(asset.netValue)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Total */}
              <div className="grid grid-cols-12 gap-4 items-center pt-4 border-t-2 border-border">
                <div className="col-span-9 text-right font-semibold text-foreground">
                  Total Business Interests:
                </div>
                <div className="col-span-3 text-right font-bold text-lg text-primary">
                  {formatCurrency(totalBusinessAssets)}
                </div>
              </div>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Personal Assets */}
      <div>
        <CollapsibleSection
          title="Personal Assets"
          description="Real estate, vehicles, investments, and other personal assets"
          icon={Wallet}
          action={
            canEditPersonal && (
              <Button onClick={addPersonalAsset} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Asset
              </Button>
            )
          }
        >
          {personalAssets.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-3">No personal assets added yet.</p>
              {canEditPersonal && (
                <Button onClick={addPersonalAsset} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Asset
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 text-sm font-medium text-muted-foreground pb-2 border-b border-border">
                <div className="col-span-3">Category</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-3 text-right">Value</div>
                <div className="col-span-1"></div>
              </div>

              <AnimatePresence>
                {personalAssets.map(asset => (
                  <motion.div
                    key={asset.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-3">
                      <Select
                        value={asset.category}
                        onValueChange={(value) => updatePersonalAsset(asset.id, 'category', value)}
                        disabled={!canEditPersonal}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSET_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-5">
                      <Input
                        type="text"
                        value={asset.description}
                        onChange={(e) => updatePersonalAsset(asset.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="h-9"
                        disabled={!canEditPersonal}
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatInputValue(asset.value)}
                          onChange={(e) => updatePersonalAsset(asset.id, 'value', parseInputValue(e.target.value))}
                          placeholder="0"
                          className="pl-7 text-right h-9"
                          disabled={!canEditPersonal}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      {canEditPersonal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePersonalAsset(asset.id)}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Total */}
              <div className="grid grid-cols-12 gap-3 items-center pt-4 border-t-2 border-border">
                <div className="col-span-8 text-right font-semibold text-foreground">
                  Total Personal Assets:
                </div>
                <div className="col-span-3 text-right font-bold text-lg text-green-600">
                  {formatCurrency(totalPersonalAssets)}
                </div>
                <div className="col-span-1"></div>
              </div>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Personal Liabilities */}
      <div>
        <CollapsibleSection
          title="Personal Liabilities"
          description="Mortgages, loans, credit cards, and other debts"
          icon={CreditCard}
          action={
            canEditPersonal && (
              <Button onClick={addPersonalLiability} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Liability
              </Button>
            )
          }
        >
          {personalLiabilities.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-3">No personal liabilities added yet.</p>
              {canEditPersonal && (
                <Button onClick={addPersonalLiability} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Liability
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 text-sm font-medium text-muted-foreground pb-2 border-b border-border">
                <div className="col-span-3">Category</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-3 text-right">Amount Owed</div>
                <div className="col-span-1"></div>
              </div>

              <AnimatePresence>
                {personalLiabilities.map(liability => (
                  <motion.div
                    key={liability.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-3">
                      <Select
                        value={liability.category}
                        onValueChange={(value) => updatePersonalLiability(liability.id, 'category', value)}
                        disabled={!canEditPersonal}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LIABILITY_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-5">
                      <Input
                        type="text"
                        value={liability.description}
                        onChange={(e) => updatePersonalLiability(liability.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="h-9"
                        disabled={!canEditPersonal}
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={formatInputValue(liability.amount)}
                          onChange={(e) => updatePersonalLiability(liability.id, 'amount', parseInputValue(e.target.value))}
                          placeholder="0"
                          className="pl-7 text-right h-9"
                          disabled={!canEditPersonal}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      {canEditPersonal && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePersonalLiability(liability.id)}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Total */}
              <div className="grid grid-cols-12 gap-3 items-center pt-4 border-t-2 border-border">
                <div className="col-span-8 text-right font-semibold text-foreground">
                  Total Liabilities:
                </div>
                <div className="col-span-3 text-right font-bold text-lg text-red-500">
                  {formatCurrency(totalLiabilities)}
                </div>
                <div className="col-span-1"></div>
              </div>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* Summary Footer */}
      <div>
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Business Interests</span>
                <span className="font-medium text-foreground">{formatCurrency(totalBusinessAssets)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Personal Assets</span>
                <span className="font-medium text-foreground">{formatCurrency(totalPersonalAssets)}</span>
              </div>
              <div className="flex justify-between text-sm pb-3 border-b border-border">
                <span className="text-muted-foreground font-semibold">Total Assets</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalAssets)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Liabilities</span>
                <span className="font-medium text-red-500">({formatCurrency(totalLiabilities)})</span>
              </div>
              <div className="flex justify-between text-xl pt-3 border-t border-border">
                <span className="font-bold text-foreground">Net Worth</span>
                <span className={`font-bold ${netWorth >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {formatCurrency(netWorth)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exit Goal CTA — link to Retirement Calculator */}
      {exitGoalAmount > 0 && (
        <div>
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      You&apos;ve set an exit goal of {formatCurrency(exitGoalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      See if your assets and exit proceeds will fund your retirement lifestyle.
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/financials/retirement">
                  <Button variant="outline" size="sm">
                    Retirement Calculator
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        This worksheet is for planning purposes only. Business values are based on current market valuations from each company&apos;s Scorecard.
        {canEditPersonal
          ? hasUnsavedChanges
            ? ' You have unsaved changes.'
            : ' All changes are saved.'
          : ' You have view-only access to this information.'}
      </p>
    </div>
  )
}
