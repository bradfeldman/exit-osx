'use client'

import { useState, useEffect, useCallback } from 'react'
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
import styles from '@/components/admin/admin-dashboard.module.css'

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
      <span className={styles.badgeHealthy}>
        <CheckCircle2 className={styles.badgeIcon} />
        Healthy
      </span>
    )
  }
  if (status === 'degraded') {
    return (
      <span className={styles.badgeDegraded}>
        <AlertTriangle className={styles.badgeIcon} />
        Degraded
      </span>
    )
  }
  return (
    <span className={styles.badgeUnhealthy}>
      <XCircle className={styles.badgeIcon} />
      Unhealthy
    </span>
  )
}

function ServiceCard({
  serviceKey,
  health,
}: {
  serviceKey: keyof typeof serviceConfig
  health: ServiceHealth
}) {
  const config = serviceConfig[serviceKey]
  const Icon = config.icon

  const cardClass =
    health.status === 'unhealthy'
      ? `${styles.serviceCard} ${styles.serviceCardUnhealthy}`
      : health.status === 'degraded'
        ? `${styles.serviceCard} ${styles.serviceCardDegraded}`
        : styles.serviceCard

  const iconWrapClass =
    health.status === 'healthy'
      ? styles.serviceIconWrapHealthy
      : health.status === 'degraded'
        ? styles.serviceIconWrapDegraded
        : styles.serviceIconWrapUnhealthy

  const iconClass =
    health.status === 'healthy'
      ? styles.serviceIconHealthy
      : health.status === 'degraded'
        ? styles.serviceIconDegraded
        : styles.serviceIconUnhealthy

  return (
    <div className={cardClass}>
      <div className={styles.serviceCardHeader}>
        <div className={styles.serviceCardHeaderInner}>
          <div className={styles.serviceCardLeft}>
            <div className={iconWrapClass}>
              <Icon className={iconClass} />
            </div>
            <div className={styles.serviceInfo}>
              <div className={styles.serviceNameRow}>
                {config.name}
                {config.critical && (
                  <Badge variant="outline" className="text-xs">
                    Critical
                  </Badge>
                )}
              </div>
              <div className={styles.cardDescription}>{config.description}</div>
            </div>
          </div>
          <StatusBadge status={health.status} />
        </div>
      </div>
      <div className={styles.serviceCardContent}>
        {health.latency !== undefined && (
          <div className={styles.serviceMetaRow}>
            <Clock className={styles.serviceMetaIcon} />
            <span>Latency: {health.latency}ms</span>
          </div>
        )}
        {health.error && (
          <div className={styles.serviceError}>{health.error}</div>
        )}
      </div>
    </div>
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
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1>Site Monitoring</h1>
          <p>Real-time health status of all services</p>
        </div>
        <div className={styles.loadingCenter}>
          <RefreshCw className={styles.spinIcon} />
        </div>
      </div>
    )
  }

  const bannerClass =
    healthData?.status === 'healthy'
      ? styles.statusBannerHealthy
      : healthData?.status === 'degraded'
        ? styles.statusBannerDegraded
        : styles.statusBannerUnhealthy

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeaderRow}>
        <div>
          <h1>Site Monitoring</h1>
          <p>Real-time health status of all services</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? styles.autoRefreshActive : undefined}
          >
            <Activity
              className={autoRefresh ? styles.autoRefreshActiveIcon : styles.refreshIcon}
            />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHealth(true)}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={isRefreshing ? styles.refreshIconSpinning : styles.refreshIcon}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status Banner */}
      {healthData && (
        <div className={bannerClass}>
          <div className={styles.statusBannerContent}>
            <div className={styles.statusBannerInner}>
              <div className={styles.statusBannerLeft}>
                {healthData.status === 'healthy' && (
                  <CheckCircle2 className={styles.statusIconHealthy} />
                )}
                {healthData.status === 'degraded' && (
                  <AlertTriangle className={styles.statusIconDegraded} />
                )}
                {healthData.status === 'unhealthy' && (
                  <XCircle className={styles.statusIconUnhealthy} />
                )}
                <div>
                  <div className={styles.statusTitle}>
                    {healthData.status === 'healthy' && 'All Systems Operational'}
                    {healthData.status === 'degraded' && 'Partial System Degradation'}
                    {healthData.status === 'unhealthy' && 'System Outage Detected'}
                  </div>
                  <div className={styles.statusMeta}>
                    Version: {healthData.version} | Last checked:{' '}
                    {lastRefresh?.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <StatusBadge status={healthData.status} />
            </div>
          </div>
        </div>
      )}

      {/* Service Grid */}
      {healthData && (
        <div>
          <h3 className={styles.sectionTitle}>Service Status</h3>
          <div className={styles.serviceGrid}>
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

      {/* External Dashboards */}
      <div>
        <h3 className={styles.sectionTitle}>External Dashboards</h3>
        <div className={styles.externalGrid}>
          <a
            href="https://vercel.com/brad-feldmans-projects/exit-osx"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            <div className={styles.externalCard}>
              <div className={styles.externalCardContent}>
                <div className={styles.externalCardInner}>
                  <div className={styles.externalCardLeft}>
                    <div className={`${styles.externalIconWrap} ${styles.externalIconWrapBlack}`}>
                      <svg className={styles.externalIcon} viewBox="0 0 76 65" fill="currentColor">
                        <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
                      </svg>
                    </div>
                    <span className={styles.externalName}>Vercel</span>
                  </div>
                  <ExternalLink className={styles.externalLinkIcon} />
                </div>
              </div>
            </div>
          </a>

          <a
            href="https://supabase.com/dashboard/project/tkzoygqdcvkrwmhzpttl"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            <div className={styles.externalCard}>
              <div className={styles.externalCardContent}>
                <div className={styles.externalCardInner}>
                  <div className={styles.externalCardLeft}>
                    <div className={`${styles.externalIconWrap} ${styles.externalIconWrapGreen}`}>
                      <Database className={styles.externalIcon} />
                    </div>
                    <span className={styles.externalName}>Supabase</span>
                  </div>
                  <ExternalLink className={styles.externalLinkIcon} />
                </div>
              </div>
            </div>
          </a>

          <a
            href={process.env.NEXT_PUBLIC_SENTRY_DSN ? 'https://sentry.io' : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            <div className={styles.externalCard}>
              <div className={styles.externalCardContent}>
                <div className={styles.externalCardInner}>
                  <div className={styles.externalCardLeft}>
                    <div className={`${styles.externalIconWrap} ${styles.externalIconWrapPurple}`}>
                      <AlertTriangle className={styles.externalIcon} />
                    </div>
                    <span className={styles.externalName}>Sentry</span>
                  </div>
                  <ExternalLink className={styles.externalLinkIcon} />
                </div>
              </div>
            </div>
          </a>

          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.externalLink}
          >
            <div className={styles.externalCard}>
              <div className={styles.externalCardContent}>
                <div className={styles.externalCardInner}>
                  <div className={styles.externalCardLeft}>
                    <div className={`${styles.externalIconWrap} ${styles.externalIconWrapOrange}`}>
                      <Activity className={styles.externalIcon} />
                    </div>
                    <span className={styles.externalName}>Google Analytics</span>
                  </div>
                  <ExternalLink className={styles.externalLinkIcon} />
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Info Card */}
      <div className={styles.infoCard}>
        <div className={styles.infoCardHeader}>
          <div className={styles.infoCardTitle}>About Monitoring</div>
        </div>
        <div className={styles.infoCardContent}>
          <p>
            <strong>Critical services</strong> (Database, Auth) will mark the system as
            unhealthy if they fail.
          </p>
          <p>
            <strong>Non-critical services</strong> (OpenAI, Email, QuickBooks) will mark the
            system as degraded, but the app will continue to function with reduced capabilities.
          </p>
          <p>
            Health checks run every 30 seconds when auto-refresh is enabled. For detailed error
            tracking and alerts, configure Sentry in your environment variables.
          </p>
        </div>
      </div>
    </div>
  )
}
