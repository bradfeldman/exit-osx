'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatIcbName } from '@/lib/utils/format-icb'
import { formatCurrency } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import styles from '@/components/advisor/advisor.module.css'
import {
  Building2,
  TrendingUp,
  Users,
  Search,
  Settings,
  ExternalLink,
  Calculator,
  Scale,
  Wallet,
  Handshake,
  Briefcase,
  User,
} from 'lucide-react'

interface Client {
  workspaceId: string
  workspaceName: string
  companyId: string
  companyName: string
  roleTemplateSlug?: string
  company: {
    id: string
    name: string
    icbIndustry: string | null
    icbSuperSector: string | null
    icbSector: string | null
    createdAt: string
  } | null
  valuation: {
    currentValue: number
    briScore: number
  } | null
}

interface AdvisorData {
  user: {
    id: string
    email: string
    name: string | null
  }
  advisorProfile: {
    id: string
    firmName: string | null
    specialty: string | null
  } | null
  clients: Client[]
  clientCount: number
}

const roleIcons: Record<string, React.ElementType> = {
  cpa: Calculator,
  attorney: Scale,
  wealth_advisor: Wallet,
  ma_advisor: Handshake,
  consultant: Briefcase,
}

const roleLabels: Record<string, string> = {
  cpa: 'CPA',
  attorney: 'Attorney',
  wealth_advisor: 'Wealth Advisor',
  ma_advisor: 'M&A Advisor',
  consultant: 'Consultant',
}

export default function AdvisorDashboardPage() {
  const [data, setData] = useState<AdvisorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadAdvisorData()
  }, [])

  async function loadAdvisorData() {
    try {
      const response = await fetch('/api/advisor')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to load advisor data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = data?.clients.filter((client) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      client.companyName.toLowerCase().includes(query) ||
      client.workspaceName.toLowerCase().includes(query) ||
      client.company?.icbIndustry?.toLowerCase().includes(query) ||
      client.company?.icbSector?.toLowerCase().includes(query)
    )
  }) || []

  // Calculate summary stats
  const totalValuation = filteredClients.reduce(
    (sum, client) => sum + (client.valuation?.currentValue || 0),
    0
  )
  const avgBriScore = filteredClients.length > 0
    ? filteredClients.reduce((sum, client) => sum + (client.valuation?.briScore || 0), 0) / filteredClients.length
    : 0

  if (loading) {
    return (
      <div className={styles.loadingCenter}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className={styles.loadingCenter}>
        <div className={styles.loadingCenterError}>
          <h2>Unable to load advisor data</h2>
          <p>Please try again later</p>
        </div>
      </div>
    )
  }

  const RoleIcon = data.advisorProfile?.specialty
    ? roleIcons[data.advisorProfile.specialty.toLowerCase().replace(' ', '_')] || User
    : User

  return (
    <div>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.identityBlock}>
            <div className={styles.avatarCircle}>
              <RoleIcon style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <p className={styles.identityName}>
                {data.user.name || 'Advisor Portal'}
              </p>
              <p className={styles.identitySubtitle}>
                {data.advisorProfile?.firmName || data.advisorProfile?.specialty || 'External Advisor'}
              </p>
            </div>
          </div>
          <div className={styles.headerRight}>
            <Link href="/advisor/profile">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Switch to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* Summary Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statRow}>
              <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
                <Users style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <p className={styles.statLabel}>Total Clients</p>
                <p className={styles.statValue}>{data.clientCount}</p>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statRow}>
              <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
                <Building2 style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <p className={styles.statLabel}>Combined Valuation</p>
                <p className={styles.statValue}>{formatCurrency(totalValuation)}</p>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statRow}>
              <div className={`${styles.statIcon} ${styles.statIconAmber}`}>
                <TrendingUp style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <p className={styles.statLabel}>Avg. Buyer Readiness</p>
                <p className={styles.statValue}>{avgBriScore.toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client List */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderRow}>
              <div>
                <p className={styles.cardTitle}>Your Clients</p>
                <p className={styles.cardDescription}>
                  Access your client companies and their exit planning data
                </p>
              </div>
              <div className={styles.searchWrapper}>
                <Search className={styles.searchIcon} />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className={styles.cardContent}>
            {filteredClients.length === 0 ? (
              <div className={styles.emptyState}>
                {searchQuery
                  ? 'No clients match your search'
                  : 'No clients yet. You will see your clients here when organizations add you as an advisor.'
                }
              </div>
            ) : (
              <div className={styles.clientGrid}>
                {filteredClients.map((client) => (
                  <Link
                    key={client.companyId}
                    href={`/advisor/${client.companyId}`}
                    className={styles.clientCard}
                  >
                    <div className={styles.clientCardInner}>
                      <div className={styles.clientCardTop}>
                        <div>
                          <p className={styles.clientCardName}>{client.companyName}</p>
                          <p className={styles.clientCardWorkspace}>
                            {client.workspaceName}
                          </p>
                        </div>
                        {client.roleTemplateSlug && (
                          <Badge variant="secondary" className="text-xs">
                            {roleLabels[client.roleTemplateSlug] || client.roleTemplateSlug}
                          </Badge>
                        )}
                      </div>

                      {client.company?.icbSector && (
                        <p className={styles.clientCardSector}>
                          {formatIcbName(client.company.icbSector)}
                        </p>
                      )}

                      <div className={styles.clientCardStats}>
                        <div>
                          <p className={styles.clientStatLabel}>Valuation</p>
                          <p className={styles.clientStatValue}>
                            {client.valuation
                              ? formatCurrency(client.valuation.currentValue)
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className={styles.clientStatLabel}>Buyer Readiness</p>
                          <p className={styles.clientStatValue}>
                            {client.valuation
                              ? client.valuation.briScore.toFixed(0)
                              : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
