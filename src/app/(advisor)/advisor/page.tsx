'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  organizationId: string
  organizationName: string
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

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
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
      client.organizationName.toLowerCase().includes(query) ||
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Unable to load advisor data</h2>
          <p className="text-muted-foreground">Please try again later</p>
        </div>
      </div>
    )
  }

  const RoleIcon = data.advisorProfile?.specialty
    ? roleIcons[data.advisorProfile.specialty.toLowerCase().replace(' ', '_')] || User
    : User

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <RoleIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">
                {data.user.name || 'Advisor Portal'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {data.advisorProfile?.firmName || data.advisorProfile?.specialty || 'External Advisor'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold">{data.clientCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Combined Valuation</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValuation)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. BRI Score</p>
                  <p className="text-2xl font-bold">{avgBriScore.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Clients</CardTitle>
                <CardDescription>
                  Access your client companies and their exit planning data
                </CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery
                  ? 'No clients match your search'
                  : 'No clients yet. You will see your clients here when organizations add you as an advisor.'
                }
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClients.map((client) => (
                  <Link
                    key={client.companyId}
                    href={`/advisor/${client.companyId}`}
                    className="block"
                  >
                    <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{client.companyName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {client.organizationName}
                            </p>
                          </div>
                          {client.roleTemplateSlug && (
                            <Badge variant="secondary" className="text-xs">
                              {roleLabels[client.roleTemplateSlug] || client.roleTemplateSlug}
                            </Badge>
                          )}
                        </div>

                        {client.company?.icbSector && (
                          <p className="text-xs text-muted-foreground mb-3">
                            {client.company.icbSector}
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                          <div>
                            <p className="text-xs text-muted-foreground">Valuation</p>
                            <p className="font-medium">
                              {client.valuation
                                ? formatCurrency(client.valuation.currentValue)
                                : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">BRI Score</p>
                            <p className="font-medium">
                              {client.valuation
                                ? client.valuation.briScore.toFixed(0)
                                : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
