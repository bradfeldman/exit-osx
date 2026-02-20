'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatIcbName } from '@/lib/utils/format-icb'
import { formatCurrency } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClientSwitcher } from '@/components/advisor/ClientSwitcher'
import { usePermissions } from '@/hooks/usePermissions'
import styles from '@/components/advisor/advisor.module.css'
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  FileText,
  ClipboardCheck,
  Calculator,
  BarChart3,
  Lock,
  ExternalLink,
  Shield,
} from 'lucide-react'

interface CompanyData {
  id: string
  name: string
  icbIndustry: string | null
  icbSuperSector: string | null
  icbSector: string | null
}

interface DashboardData {
  tier1?: {
    currentValue: number
    potentialValue: number
    briScore: number
    percentileRank: number
  }
  tier2?: {
    revenueMultipleLow: number
    revenueMultipleHigh: number
    ebitdaMultipleLow: number
    ebitdaMultipleHigh: number
  }
}

export default function AdvisorClientPage() {
  const params = useParams()
  const router = useRouter()
  const companyId = params.companyId as string

  const { hasPermission, isLoading: permissionsLoading } = usePermissions({ companyId })

  const [company, setCompany] = useState<CompanyData | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (companyId) {
      loadClientData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  async function loadClientData() {
    setLoading(true)
    setError(null)

    try {
      // Load company data
      const companyRes = await fetch(`/api/companies/${companyId}`)
      if (!companyRes.ok) {
        if (companyRes.status === 403) {
          setError('You do not have access to this client')
        } else {
          setError('Failed to load client data')
        }
        return
      }
      const companyData = await companyRes.json()
      setCompany(companyData.company)

      // Load dashboard data
      const dashboardRes = await fetch(`/api/companies/${companyId}/dashboard`)
      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json()
        setDashboard(dashboardData)
      }
    } catch (err) {
      console.error('Failed to load client data:', err)
      setError('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }

  if (loading || permissionsLoading) {
    return (
      <div>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <div className={styles.skeletonBar} />
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.loadingBody}>
            <div className={styles.spinner} />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/advisor">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <div className={styles.accessDenied}>
                <Lock className={styles.accessDeniedIcon} style={{ width: 48, height: 48 }} />
                <p className={styles.accessDeniedTitle}>Access Denied</p>
                <p className={styles.accessDeniedText}>{error}</p>
                <Button onClick={() => router.push('/advisor')}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Build module cards based on permissions
  const modules = [
    {
      key: 'assessments',
      title: 'Assessments',
      description: 'View company readiness assessments',
      icon: ClipboardCheck,
      href: `/dashboard/diagnosis?company=${companyId}`,
      enabled: hasPermission('assessments.company:view'),
    },
    {
      key: 'financials',
      title: 'Financial Statements',
      description: 'View and analyze financial data',
      icon: Calculator,
      href: `/dashboard/financials?company=${companyId}`,
      enabled: hasPermission('financials.statements:view'),
    },
    {
      key: 'valuation',
      title: 'Valuation',
      description: 'View valuation details',
      icon: BarChart3,
      href: `/dashboard/valuation?company=${companyId}`,
      enabled: hasPermission('valuation.summary:view'),
    },
    {
      key: 'dataroom',
      title: 'Data Room',
      description: 'Access shared documents',
      icon: FileText,
      href: `/dashboard/deal-room?company=${companyId}`,
      enabled: hasPermission('dataroom.financial:view') || hasPermission('dataroom.legal:view'),
    },
    {
      key: 'playbook',
      title: 'Action Plan',
      description: 'View assigned tasks',
      icon: TrendingUp,
      href: `/dashboard/action-center?company=${companyId}`,
      enabled: hasPermission('playbook.tasks:view'),
    },
    {
      key: 'signals',
      title: 'Signal Review',
      description: 'Review and confirm client signals',
      icon: Shield,
      href: `/advisor/${companyId}/signals`,
      enabled: true, // Always available to advisors
    },
  ]

  return (
    <div>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link href="/advisor">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                All Clients
              </Button>
            </Link>
            <div className={styles.divider} />
            <ClientSwitcher currentCompanyId={companyId} />
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Full Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        {/* Company Info */}
        <div className={styles.companyInfo}>
          <div className={styles.companyInfoRow}>
            <div className={styles.companyIconBox}>
              <Building2 style={{ width: 24, height: 24 }} />
            </div>
            <div>
              <h1 className={styles.companyName}>{company?.name}</h1>
              {company?.icbSector && (
                <p className={styles.companySector}>{formatIcbName(company.icbSector)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {dashboard?.tier1 && (
          <div className={styles.statsGrid4}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Current Value</p>
              <p className={styles.statValueGreen}>
                {formatCurrency(dashboard.tier1.currentValue)}
              </p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Potential Value</p>
              <p className={styles.statValueBlue}>
                {formatCurrency(dashboard.tier1.potentialValue)}
              </p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Buyer Readiness Index</p>
              <p className={styles.statValue}>
                {dashboard.tier1.briScore.toFixed(0)}
              </p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Percentile</p>
              <p className={styles.statValueAmber}>
                {dashboard.tier1.percentileRank.toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        {/* Module Access */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.cardTitle}>Available Modules</p>
            <p className={styles.cardDescription}>
              Access client data based on your assigned permissions
            </p>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.moduleGrid}>
              {modules.map((module) => {
                const Icon = module.icon
                return (
                  <div key={module.key}>
                    {module.enabled ? (
                      <Link href={module.href} className={styles.moduleCard}>
                        <div className={styles.moduleCardBody}>
                          <div className={styles.moduleIconBox}>
                            <Icon style={{ width: 20, height: 20 }} />
                          </div>
                          <div>
                            <p className={styles.moduleTitle}>{module.title}</p>
                            <p className={styles.moduleDescription}>
                              {module.description}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className={styles.moduleCardLocked}>
                        <div className={styles.moduleCardBody}>
                          <div className={styles.moduleIconBoxLocked}>
                            <Lock style={{ width: 20, height: 20 }} />
                          </div>
                          <div>
                            <p className={styles.moduleTitle}>
                              {module.title}
                              <Badge variant="outline" className="text-xs">
                                No Access
                              </Badge>
                            </p>
                            <p className={styles.moduleDescription}>
                              {module.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
