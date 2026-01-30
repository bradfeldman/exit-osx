'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Shield,
  HardDrive,
  Brain,
  Mail,
  Calculator,
  Activity,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency?: number
  error?: string
  lastChecked: string
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: ServiceHealth
    supabaseAuth: ServiceHealth
    supabaseStorage: ServiceHealth
    openai: ServiceHealth
    resend: ServiceHealth
    quickbooks: ServiceHealth
  }
  version: string
}

const serviceConfig = {
  database: {
    name: 'PostgreSQL Database',
    description: 'Primary data storage via Prisma',
    icon: Database,
    critical: true,
  },
  supabaseAuth: {
    name: 'Supabase Auth',
    description: 'User authentication and sessions',
    icon: Shield,
    critical: true,
  },
  supabaseStorage: {
    name: 'Supabase Storage',
    description: 'File storage for Data Room documents',
    icon: HardDrive,
    critical: false,
  },
  openai: {
    name: 'OpenAI API',
    description: 'Industry classification (GPT-4o)',
    icon: Brain,
    critical: false,
  },
  resend: {
    name: 'Resend Email',
    description: 'Transactional email delivery',
    icon: Mail,
    critical: false,
  },
  quickbooks: {
    name: 'QuickBooks API',
    description: 'Financial data integration',
    icon: Calculator,
    critical: false,
  },
}

function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' }) {
  if (status === 'healthy') {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Healthy
      </Badge>
    )
  }
  if (status === 'degraded') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Degraded
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
      <XCircle className="w-3 h-3 mr-1" />
      Unhealthy
    </Badge>
  )
}

function ServiceCard({
  serviceKey,
  health
}: {
  serviceKey: keyof typeof serviceConfig
  health: ServiceHealth
}) {
  const config = serviceConfig[serviceKey]
  const Icon = config.icon

  return (
    <Card className={cn(
      'relative overflow-hidden',
      health.status === 'unhealthy' && 'border-red-200 bg-red-50/50',
      health.status === 'degraded' && 'border-yellow-200 bg-yellow-50/50',
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              health.status === 'healthy' && 'bg-green-100',
              health.status === 'degraded' && 'bg-yellow-100',
              health.status === 'unhealthy' && 'bg-red-100',
            )}>
              <Icon className={cn(
                'h-5 w-5',
                health.status === 'healthy' && 'text-green-600',
                health.status === 'degraded' && 'text-yellow-600',
                health.status === 'unhealthy' && 'text-red-600',
              )} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {config.name}
                {config.critical && (
                  <Badge variant="outline" className="text-xs">Critical</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">{config.description}</CardDescription>
            </div>
          </div>
          <StatusBadge status={health.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-1 text-sm">
          {health.latency !== undefined && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Latency: {health.latency}ms</span>
            </div>
          )}
          {health.error && (
            <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
              {health.error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function MonitoringPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchHealth = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)

    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthData(data)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Failed to fetch health status:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchHealth])

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Site Monitoring</h1>
          <p className="text-muted-foreground">Real-time health status of all services</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Monitoring</h1>
          <p className="text-muted-foreground">Real-time health status of all services</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(autoRefresh && 'bg-green-50 border-green-200')}
          >
            <Activity className={cn('h-4 w-4 mr-1', autoRefresh && 'text-green-600')} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {healthData && (
        <Card className={cn(
          'border-2',
          healthData.status === 'healthy' && 'border-green-500 bg-green-50',
          healthData.status === 'degraded' && 'border-yellow-500 bg-yellow-50',
          healthData.status === 'unhealthy' && 'border-red-500 bg-red-50',
        )}>
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {healthData.status === 'healthy' && (
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                )}
                {healthData.status === 'degraded' && (
                  <AlertTriangle className="h-12 w-12 text-yellow-600" />
                )}
                {healthData.status === 'unhealthy' && (
                  <XCircle className="h-12 w-12 text-red-600" />
                )}
                <div>
                  <h2 className="text-xl font-semibold">
                    {healthData.status === 'healthy' && 'All Systems Operational'}
                    {healthData.status === 'degraded' && 'Partial System Degradation'}
                    {healthData.status === 'unhealthy' && 'System Outage Detected'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Version: {healthData.version} |
                    Last checked: {lastRefresh?.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <StatusBadge status={healthData.status} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Grid */}
      {healthData && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Service Status</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(serviceConfig) as Array<keyof typeof serviceConfig>).map((key) => (
              <ServiceCard
                key={key}
                serviceKey={key}
                health={healthData.services[key]}
              />
            ))}
          </div>
        </div>
      )}

      {/* External Links */}
      <div>
        <h3 className="text-lg font-semibold mb-4">External Dashboards</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <a
            href="https://vercel.com/brad-feldmans-projects/exit-osx"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-black rounded">
                      <svg className="h-4 w-4 text-white" viewBox="0 0 76 65" fill="currentColor">
                        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                      </svg>
                    </div>
                    <span className="font-medium">Vercel</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </a>

          <a
            href="https://supabase.com/dashboard/project/tkzoygqdcvkrwmhzpttl"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-600 rounded">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">Supabase</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </a>

          <a
            href={process.env.NEXT_PUBLIC_SENTRY_DSN ? 'https://sentry.io' : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-600 rounded">
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">Sentry</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </a>

          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500 rounded">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">Google Analytics</span>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </a>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">About Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Critical services</strong> (Database, Auth) will mark the system as unhealthy if they fail.
          </p>
          <p>
            <strong>Non-critical services</strong> (OpenAI, Email, QuickBooks) will mark the system as degraded,
            but the app will continue to function with reduced capabilities.
          </p>
          <p>
            Health checks run every 30 seconds when auto-refresh is enabled.
            For detailed error tracking and alerts, configure Sentry in your environment variables.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
