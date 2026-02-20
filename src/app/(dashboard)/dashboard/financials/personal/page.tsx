'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from '@/lib/motion'
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
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { PFSWizardFlow } from '@/components/pfs-wizard/PFSWizardFlow'
import styles from '@/components/financials/financials-pages.module.css'

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

function parsePercentage(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const num = parseFloat(cleaned) || 0
  return Math.min(100, Math.max(0, num))
}

function formatPercentage(value: number): string {
  if (value === 0) return ''
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
    <div className={styles.pfsSection}>
      <div className={styles.pfsSectionHeader}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
          className={styles.pfsSectionHeaderLeft}
        >
          <div className={styles.pfsSectionIconWrap}>
            <Icon />
          </div>
          <div className={styles.pfsSectionTitleWrap}>
            <h3 className={styles.pfsSectionTitle}>{title}</h3>
            {description && (
              <p className={styles.pfsSectionSubtitle}>{description}</p>
            )}
          </div>
        </div>
        <div className={styles.pfsSectionHeaderRight}>
          {action}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={styles.pfsSectionChevronBtn}
            aria-label={isOpen ? 'Collapse section' : 'Expand section'}
          >
            <ChevronDown
              style={{
                width: 20,
                height: 20,
                color: 'var(--text-secondary)',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className={styles.pfsSectionBody}>
          {children}
        </div>
      )}
    </div>
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
  const [showWizard, setShowWizard] = useState<boolean | null>(null)

  const [originalState, setOriginalState] = useState<{
    personalAssets: PersonalAsset[]
    personalLiabilities: PersonalLiability[]
    businessOwnership: Record<string, number>
    currentAge: number | null
    retirementAge: number | null
    exitGoalAmount: number
  } | null>(null)

  const canViewPersonal = hasPermission('personal.retirement:view') || hasPermission('personal.net_worth:view')
  const canEditPersonal = hasPermission('personal.retirement:edit') || hasPermission('personal.net_worth:edit')

  const hasUnsavedChanges = useMemo(() => {
    if (!originalState) return false
    if (JSON.stringify(personalAssets) !== JSON.stringify(originalState.personalAssets)) return true
    if (JSON.stringify(personalLiabilities) !== JSON.stringify(originalState.personalLiabilities)) return true
    const currentOwnership: Record<string, number> = {}
    businessAssets.forEach(a => { currentOwnership[a.companyId] = a.ownershipPercent })
    if (JSON.stringify(currentOwnership) !== JSON.stringify(originalState.businessOwnership)) return true
    if (currentAge !== originalState.currentAge) return true
    if (retirementAge !== originalState.retirementAge) return true
    if (exitGoalAmount !== originalState.exitGoalAmount) return true
    return false
  }, [personalAssets, personalLiabilities, businessAssets, originalState, currentAge, retirementAge, exitGoalAmount])

  useEffect(() => {
    async function loadAllData() {
      if (!permissionsLoading && canViewPersonal) {
        let loadedPersonalData = { assets: [] as PersonalAsset[], liabilities: [] as PersonalLiability[], currentAge: null as number | null, retirementAge: null as number | null, exitGoalAmount: 0, businessOwnership: null as Record<string, number> | null, hasData: false }
        if (selectedCompanyId) {
          loadedPersonalData = await loadPersonalFinancials(selectedCompanyId)
        }
        if (showWizard === null) {
          setShowWizard(!loadedPersonalData.hasData)
        }
        await loadCompaniesWithOriginalState(loadedPersonalData)
      }
    }
    loadAllData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoading, canViewPersonal, selectedCompanyId])

  async function savePersonalFinancials() {
    if (!selectedCompanyId || !canEditPersonal) return
    setSaving(true)
    setSavedSuccessfully(false)
    setSaveError(null)
    try {
      const ownership: Record<string, number> = {}
      businessAssets.forEach(a => { ownership[a.companyId] = a.ownershipPercent })
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
      refetchProgression()
    } catch (error) {
      console.error('Failed to save personal financials:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function loadPersonalFinancials(companyId: string): Promise<{ assets: PersonalAsset[], liabilities: PersonalLiability[], currentAge: number | null, retirementAge: number | null, exitGoalAmount: number, businessOwnership: Record<string, number> | null, hasData: boolean }> {
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
          const hasData = data.personalFinancials.id !== null && (
            loadedAssets.length > 0 || loadedLiabilities.length > 0 || loadedCurrentAge !== null
          )
          setPersonalAssets(loadedAssets)
          setPersonalLiabilities(loadedLiabilities)
          setCurrentAge(loadedCurrentAge)
          setRetirementAge(loadedRetirementAge)
          setExitGoalAmount(loadedExitGoal)
          return { assets: loadedAssets, liabilities: loadedLiabilities, currentAge: loadedCurrentAge, retirementAge: loadedRetirementAge, exitGoalAmount: loadedExitGoal, businessOwnership: loadedOwnership, hasData }
        }
      }
    } catch (error) {
      console.error('Failed to load personal financials:', error)
      loadSavedDataFromLocalStorage()
    }
    return { assets: [], liabilities: [], currentAge: null, retirementAge: null, exitGoalAmount: 0, businessOwnership: null, hasData: false }
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

  async function loadCompaniesWithOriginalState(personalData: { assets: PersonalAsset[], liabilities: PersonalLiability[], currentAge: number | null, retirementAge: number | null, exitGoalAmount: number, businessOwnership: Record<string, number> | null, hasData: boolean }) {
    setLoading(true)
    try {
      const response = await fetch('/api/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data.companies || [])

        let savedOwnership: Record<string, number> = {}
        if (personalData.businessOwnership && Object.keys(personalData.businessOwnership).length > 0) {
          savedOwnership = personalData.businessOwnership
        } else {
          try {
            const saved = localStorage.getItem('pfs_businessOwnership')
            if (saved) savedOwnership = JSON.parse(saved)
          } catch { /* Ignore parse errors */ }
        }

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

        const ownership: Record<string, number> = {}
        assets.forEach(a => { ownership[a.companyId] = a.ownershipPercent })
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
          return { ...asset, ownershipPercent: percent, netValue: asset.marketValue * (percent / 100) }
        }
        return asset
      })
    )
  }

  function addPersonalAsset() {
    setPersonalAssets(prev => [...prev, { id: `asset-${Date.now()}`, category: ASSET_CATEGORIES[0], description: '', value: 0 }])
  }

  function updatePersonalAsset(id: string, field: keyof PersonalAsset, value: string | number) {
    setPersonalAssets(prev => prev.map(asset => asset.id === id ? { ...asset, [field]: value } : asset))
  }

  function removePersonalAsset(id: string) {
    setPersonalAssets(prev => prev.filter(asset => asset.id !== id))
  }

  function addPersonalLiability() {
    setPersonalLiabilities(prev => [...prev, { id: `liability-${Date.now()}`, category: LIABILITY_CATEGORIES[0], description: '', amount: 0 }])
  }

  function updatePersonalLiability(id: string, field: keyof PersonalLiability, value: string | number) {
    setPersonalLiabilities(prev => prev.map(liability => liability.id === id ? { ...liability, [field]: value } : liability))
  }

  function removePersonalLiability(id: string) {
    setPersonalLiabilities(prev => prev.filter(liability => liability.id !== id))
  }

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
        className={styles.loading}
      >
        <div style={{ textAlign: 'center' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{ marginBottom: 16 }}
          >
            <Loader2 style={{ width: 40, height: 40, color: 'var(--accent)', margin: '0 auto' }} />
          </motion.div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading...</p>
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
        className={styles.pfsPermissionDenied}
      >
        <div className={styles.pfsHeaderLeft}>
          <h1>Personal Financial Statement</h1>
          <p>Track your personal assets, liabilities, and net worth</p>
        </div>
        <div className={styles.pfsPermissionCard}>
          <div className={styles.pfsPermissionIcon}>
            <Lock />
          </div>
          <p className={styles.pfsPermissionTitle}>Access Restricted</p>
          <p className={styles.pfsPermissionText}>
            You don&apos;t have permission to view personal financial information.
            Contact your organization administrator if you need access.
          </p>
        </div>
      </motion.div>
    )
  }

  // Data loading state - skeleton
  if (loading) {
    return (
      <div className={styles.pfsSkeleton}>
        <div className={styles.pfsSkeletonHeader}>
          <div>
            <div className={styles.pfsSkeletonBlock} style={{ width: 320, height: 36 }} />
            <div className={styles.pfsSkeletonBlock} style={{ width: 260, height: 20, marginTop: 8 }} />
          </div>
          <div className={styles.pfsSkeletonBlock} style={{ width: 128, height: 40, borderRadius: 8 }} />
        </div>
        <div className={styles.pfsSkeletonCard}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ textAlign: 'center', padding: 16, borderRadius: 12, background: 'rgba(0,0,0,0.04)' }}>
                <div className={styles.pfsSkeletonBlock} style={{ width: 96, height: 16, margin: '0 auto 12px' }} />
                <div className={styles.pfsSkeletonBlock} style={{ width: 128, height: 40, margin: '0 auto' }} />
              </div>
            ))}
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.pfsSection}>
            <div className={styles.pfsSkeletonRow}>
              <div className={styles.pfsSkeletonBlock} style={{ width: 40, height: 40, borderRadius: 8 }} />
              <div>
                <div className={styles.pfsSkeletonBlock} style={{ width: 160, height: 20 }} />
                <div className={styles.pfsSkeletonBlock} style={{ width: 256, height: 16, marginTop: 8 }} />
              </div>
            </div>
            <div className={styles.pfsSkeletonInner}>
              {[1, 2].map((j) => (
                <div key={j} className={styles.pfsSkeletonBlock} style={{ height: 48, borderRadius: 8 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // PFS Wizard for first-time users
  if (showWizard) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <PFSWizardFlow
          onComplete={() => {
            setShowWizard(false)
            setLoading(true)
            async function reloadAfterWizard() {
              if (selectedCompanyId) {
                const reloaded = await loadPersonalFinancials(selectedCompanyId)
                await loadCompaniesWithOriginalState(reloaded)
              }
            }
            reloadAfterWizard()
          }}
          onSkip={() => setShowWizard(false)}
        />
      </div>
    )
  }

  return (
    <div className={styles.pfsPage}>
      {/* Header */}
      <div className={styles.pfsHeader}>
        <div className={styles.pfsHeaderLeft}>
          <h1>Personal Financial Statement</h1>
          <p>Track your personal assets, liabilities, and net worth</p>
        </div>
        {canEditPersonal && (
          <div className={styles.pfsHeaderRight}>
            {saveError && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`${styles.pfsSaveMsg} ${styles.pfsSaveMsgError}`}
              >
                <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{saveError}</span>
              </motion.div>
            )}
            {savedSuccessfully && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`${styles.pfsSaveMsg} ${styles.pfsSaveMsgSuccess}`}
              >
                <CheckCircle2 style={{ width: 16, height: 16 }} />
                Saved
              </motion.div>
            )}
            {lastSaved && !savedSuccessfully && !saveError && (
              <span className={styles.pfsSaveTimestamp}>
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={savePersonalFinancials}
              disabled={saving || !hasUnsavedChanges}
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
        <div className={styles.pfsReadOnlyBar}>
          <AlertTriangle style={{ width: 18, height: 18, color: '#d97706', flexShrink: 0 }} />
          <span>
            You have view-only access to this page. Contact your administrator to request edit permissions.
          </span>
        </div>
      )}

      {/* Net Worth Summary */}
      <div className={styles.pfsNetWorthCard}>
        <div className={styles.pfsNetWorthGrid}>
          <div className={styles.pfsNetWorthItem}>
            <div className={styles.pfsNetWorthItemLabel}>
              <TrendingUp style={{ width: 20, height: 20, color: '#16a34a' }} />
              <p>Total Assets</p>
            </div>
            <p className={`${styles.pfsNetWorthValue} ${styles.pfsNetWorthValueGreen}`}>
              {formatCurrency(totalAssets)}
            </p>
          </div>
          <div className={styles.pfsNetWorthItem}>
            <div className={styles.pfsNetWorthItemLabel}>
              <TrendingDown style={{ width: 20, height: 20, color: '#ef4444' }} />
              <p>Total Liabilities</p>
            </div>
            <p className={`${styles.pfsNetWorthValue} ${styles.pfsNetWorthValueRed}`}>
              {formatCurrency(totalLiabilities)}
            </p>
          </div>
          <div className={styles.pfsNetWorthItem}>
            <div className={styles.pfsNetWorthItemLabel}>
              <DollarSign style={{ width: 20, height: 20, color: 'var(--accent)' }} />
              <p>Net Worth</p>
            </div>
            <p className={`${styles.pfsNetWorthValue} ${netWorth >= 0 ? styles.pfsNetWorthValuePrimary : styles.pfsNetWorthValueRed}`}>
              {formatCurrency(netWorth)}
            </p>
          </div>
        </div>
      </div>

      {/* Owner Profile */}
      <CollapsibleSection
        title="Owner Profile"
        description="Your age for retirement planning"
        icon={User}
        defaultOpen={!!currentAge}
      >
        <div className={styles.pfsOwnerGrid}>
          <div>
            <label className={styles.pfsFieldLabel}>Current Age</label>
            <Input
              type="text"
              inputMode="numeric"
              value={currentAge !== null ? String(currentAge) : ''}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                if (!v) { setCurrentAge(null); return }
                setCurrentAge(parseInt(v))
              }}
              onBlur={() => {
                if (currentAge !== null) {
                  setCurrentAge(Math.min(125, Math.max(0, currentAge)))
                }
              }}
              placeholder="52"
              className="h-9 w-24"
              disabled={!canEditPersonal}
            />
            <p className={styles.pfsFieldHint}>Used for retirement planning calculations</p>
          </div>
          <div>
            <label className={styles.pfsFieldLabel}>Retirement Age</label>
            <Input
              type="text"
              inputMode="numeric"
              value={retirementAge !== null ? String(retirementAge) : ''}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                if (!v) { setRetirementAge(null); return }
                setRetirementAge(parseInt(v))
              }}
              onBlur={() => {
                if (retirementAge !== null) {
                  setRetirementAge(Math.min(125, Math.max(0, retirementAge)))
                }
              }}
              placeholder="65"
              className="h-9 w-24"
              disabled={!canEditPersonal}
            />
            <p className={styles.pfsFieldHint}>Target age for retirement planning</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Business Assets */}
      <CollapsibleSection
        title="Business Interests"
        description="Your ownership stake in businesses (values from Scorecard)"
        icon={Building2}
      >
        {businessAssets.length === 0 ? (
          <div className={styles.pfsSectionEmpty}>
            <Building2 style={{ width: 48, height: 48, margin: '0 auto 12px', display: 'block', color: 'rgba(0,0,0,0.15)' }} />
            <p>No businesses found in your account.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className={`${styles.pfsTableHeader} ${styles.pfsTableHeaderBiz}`}>
              <div>Business Name</div>
              <div className={styles.pfsTableColRight}>Market Value</div>
              <div style={{ textAlign: 'center' }}>Ownership %</div>
              <div className={styles.pfsTableColRight}>Your Value</div>
            </div>

            <AnimatePresence>
              {businessAssets.map(asset => (
                <motion.div
                  key={asset.companyId}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={styles.pfsTableRowBiz}
                >
                  <div className={styles.pfsBizName}>{asset.companyName}</div>
                  <div className={styles.pfsBizMarket}>{formatCurrency(asset.marketValue)}</div>
                  <div className={styles.pfsTableColCenter}>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formatPercentage(asset.ownershipPercent)}
                      onChange={(e) => handleOwnershipChange(asset.companyId, e.target.value)}
                      placeholder="100"
                      className="w-20 text-center h-9"
                      disabled={!canEditPersonal}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>%</span>
                  </div>
                  <div className={styles.pfsBizValue}>{formatCurrency(asset.netValue)}</div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className={`${styles.pfsTableTotal} ${styles.pfsTableTotalBiz}`}>
              <div className={styles.pfsTableTotalLabel}>Total Business Interests:</div>
              <div className={`${styles.pfsTableTotalValue} ${styles.pfsTableTotalValuePrimary}`}>
                {formatCurrency(totalBusinessAssets)}
              </div>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Personal Assets */}
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
          <div className={styles.pfsSectionEmpty}>
            <Wallet style={{ width: 48, height: 48, margin: '0 auto 12px', display: 'block', color: 'rgba(0,0,0,0.15)' }} />
            <p>No personal assets added yet.</p>
            {canEditPersonal && (
              <Button onClick={addPersonalAsset} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Asset
              </Button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={`${styles.pfsTableHeader} ${styles.pfsTableHeaderAsset}`}>
              <div>Category</div>
              <div>Description</div>
              <div className={styles.pfsTableColRight}>Value</div>
              <div />
            </div>

            <AnimatePresence>
              {personalAssets.map(asset => (
                <motion.div
                  key={asset.id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={styles.pfsTableRowAsset}
                >
                  <div>
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
                  <div>
                    <Input
                      type="text"
                      value={asset.description}
                      onChange={(e) => updatePersonalAsset(asset.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="h-9"
                      disabled={!canEditPersonal}
                    />
                  </div>
                  <div>
                    <div className={styles.pfsCurrencyWrap}>
                      <span className={styles.pfsCurrencySymbol}>$</span>
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
                  <div style={{ textAlign: 'center' }}>
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

            <div className={`${styles.pfsTableTotal} ${styles.pfsTableTotalAsset}`}>
              <div className={styles.pfsTableTotalLabel}>Total Personal Assets:</div>
              <div className={`${styles.pfsTableTotalValue} ${styles.pfsTableTotalValueGreen}`}>
                {formatCurrency(totalPersonalAssets)}
              </div>
              <div />
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Personal Liabilities */}
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
          <div className={styles.pfsSectionEmpty}>
            <CreditCard style={{ width: 48, height: 48, margin: '0 auto 12px', display: 'block', color: 'rgba(0,0,0,0.15)' }} />
            <p>No personal liabilities added yet.</p>
            {canEditPersonal && (
              <Button onClick={addPersonalLiability} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Your First Liability
              </Button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className={`${styles.pfsTableHeader} ${styles.pfsTableHeaderAsset}`}>
              <div>Category</div>
              <div>Description</div>
              <div className={styles.pfsTableColRight}>Amount Owed</div>
              <div />
            </div>

            <AnimatePresence>
              {personalLiabilities.map(liability => (
                <motion.div
                  key={liability.id}
                  variants={rowVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={styles.pfsTableRowAsset}
                >
                  <div>
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
                  <div>
                    <Input
                      type="text"
                      value={liability.description}
                      onChange={(e) => updatePersonalLiability(liability.id, 'description', e.target.value)}
                      placeholder="Description"
                      className="h-9"
                      disabled={!canEditPersonal}
                    />
                  </div>
                  <div>
                    <div className={styles.pfsCurrencyWrap}>
                      <span className={styles.pfsCurrencySymbol}>$</span>
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
                  <div style={{ textAlign: 'center' }}>
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

            <div className={`${styles.pfsTableTotal} ${styles.pfsTableTotalAsset}`}>
              <div className={styles.pfsTableTotalLabel}>Total Liabilities:</div>
              <div className={`${styles.pfsTableTotalValue} ${styles.pfsTableTotalValueRed}`}>
                {formatCurrency(totalLiabilities)}
              </div>
              <div />
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Summary Footer */}
      <div className={styles.pfsSummaryCard}>
        <div className={styles.pfsSummaryRows}>
          <div className={styles.pfsSummaryRow}>
            <span className={styles.pfsSummaryRowLabel}>Business Interests</span>
            <span className={styles.pfsSummaryRowValue}>{formatCurrency(totalBusinessAssets)}</span>
          </div>
          <div className={styles.pfsSummaryRow}>
            <span className={styles.pfsSummaryRowLabel}>Personal Assets</span>
            <span className={styles.pfsSummaryRowValue}>{formatCurrency(totalPersonalAssets)}</span>
          </div>
          <div className={`${styles.pfsSummaryRow} ${styles.pfsSummaryDivider}`}>
            <span className={styles.pfsSummaryRowLabel} style={{ fontWeight: 600 }}>Total Assets</span>
            <span className={styles.pfsSummaryRowValueGreen}>{formatCurrency(totalAssets)}</span>
          </div>
          <div className={styles.pfsSummaryRow}>
            <span className={styles.pfsSummaryRowLabel}>Total Liabilities</span>
            <span className={styles.pfsSummaryRowValueRed}>({formatCurrency(totalLiabilities)})</span>
          </div>
          <div className={styles.pfsSummaryTotalRow}>
            <span className={styles.pfsSummaryTotalLabel}>Net Worth</span>
            <span className={netWorth >= 0 ? styles.pfsSummaryTotalValuePositive : styles.pfsSummaryTotalValueNegative}>
              {formatCurrency(netWorth)}
            </span>
          </div>
        </div>
      </div>

      {/* Note */}
      <p className={styles.pfsNote}>
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
