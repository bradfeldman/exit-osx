'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatIcbName } from '@/lib/utils/format-icb'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClientSwitcher } from '@/components/advisor/ClientSwitcher'
import { usePermissions } from '@/hooks/usePermissions'
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
      <div className="min-h-screen">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <header className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link href="/advisor">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-muted-foreground text-center max-w-md">{error}</p>
              <Button className="mt-4" onClick={() => router.push('/advisor')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/advisor">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  All Clients
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <ClientSwitcher currentCompanyId={companyId} />
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Full Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Company Info */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{company?.name}</h1>
              {company?.icbSector && (
                <p className="text-muted-foreground">{formatIcbName(company.icbSector)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {dashboard?.tier1 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboard.tier1.currentValue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Potential Value</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboard.tier1.potentialValue)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Buyer Readiness Index</p>
                <p className="text-2xl font-bold">
                  {dashboard.tier1.briScore.toFixed(0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Percentile</p>
                <p className="text-2xl font-bold text-amber-600">
                  {dashboard.tier1.percentileRank.toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Module Access */}
        <Card>
          <CardHeader>
            <CardTitle>Available Modules</CardTitle>
            <CardDescription>
              Access client data based on your assigned permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => {
                const Icon = module.icon
                return (
                  <div key={module.key}>
                    {module.enabled ? (
                      <Link href={module.href}>
                        <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-medium">{module.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {module.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ) : (
                      <Card className="opacity-50 h-full">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-medium flex items-center gap-2">
                                {module.title}
                                <Badge variant="outline" className="text-xs">
                                  No Access
                                </Badge>
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {module.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
