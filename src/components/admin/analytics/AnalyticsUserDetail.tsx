'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Monitor, Smartphone, Tablet, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import styles from '@/components/admin/admin-misc.module.css'

interface UserData {
  id: string
  email: string
  name: string | null
  createdAt: string
  updatedAt: string
  userType: string
  exposureState: string
  emailVerified: boolean
  isSuperAdmin: boolean
  planTier: string | null
  trialEndsAt: string | null
  subscriptionStatus: string | null
  eventCount: number
  sessionCount: number
}

interface ProductEvent {
  id: string
  eventName: string
  eventCategory: string
  metadata: unknown
  page: string | null
  deviceType: string | null
  browser: string | null
  os: string | null
  createdAt: string
}

interface DeviceBreakdown {
  deviceType: string | null
  count: number
}

interface BrowserBreakdown {
  browser: string | null
  count: number
}

interface CompanyState {
  id: string
  name: string
  assessmentCount: number
  taskCount: number
  completedTaskCount: number
  briScore: number | null
  currentValue: number | null
  potentialValue: number | null
  lastSnapshotAt: string | null
}

interface AnalyticsUserDetailProps {
  user: UserData
  recentEvents: ProductEvent[]
  deviceBreakdown: DeviceBreakdown[]
  browserBreakdown: BrowserBreakdown[]
  companyState: CompanyState | null
  engagementStatus: 'active' | 'stalled' | 'dormant'
}

const categoryBadgeClass: Record<string, string> = {
  auth: 'bg-purple-100 text-purple-800',
  navigation: 'bg-blue-100 text-blue-800',
  onboarding: 'bg-green-100 text-green-800',
  assessment: 'bg-yellow-100 text-yellow-800',
  task: 'bg-orange-100 text-orange-800',
  valuation: 'bg-pink-100 text-pink-800',
  subscription: 'bg-indigo-100 text-indigo-800',
}

const statusBadgeClass: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  stalled: 'bg-yellow-100 text-yellow-800',
  dormant: 'bg-red-100 text-red-800',
}

function DeviceIcon({ type }: { type: string | null }) {
  if (type === 'mobile') return <Smartphone className="h-4 w-4" />
  if (type === 'tablet') return <Tablet className="h-4 w-4" />
  return <Monitor className="h-4 w-4" />
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`
  return `$${value.toLocaleString()}`
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function AnalyticsUserDetail({
  user,
  recentEvents,
  deviceBreakdown,
  browserBreakdown,
  companyState,
  engagementStatus,
}: AnalyticsUserDetailProps) {
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <Link href="/admin/analytics/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className={styles.detailHeaderText}>
          <h1 className={styles.detailTitle}>{user.name || user.email}</h1>
          <p className={styles.detailSubtitle}>{user.email}</p>
        </div>
        <Badge variant="secondary" className={statusBadgeClass[engagementStatus]}>
          {engagementStatus}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardContent}>
            <div className={styles.summaryValue}>{user.eventCount}</div>
            <p className={styles.summaryLabel}>Total Events</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardContent}>
            <div className={styles.summaryValue}>{user.sessionCount}</div>
            <p className={styles.summaryLabel}>Sessions</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardContent}>
            <div className={styles.summaryValue}>{user.planTier || 'None'}</div>
            <p className={styles.summaryLabel}>Plan</p>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardContent}>
            <div className={styles.summaryValue}>{user.exposureState}</div>
            <p className={styles.summaryLabel}>Exposure State</p>
          </div>
        </div>
      </div>

      {/* Company State */}
      {companyState && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderInner}>
              <p className={styles.cardTitle}>Company: {companyState.name}</p>
            </div>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.companyMetrics}>
              <div className={styles.companyMetric}>
                <div className={styles.companyMetricValue}>
                  {companyState.briScore !== null ? `${(companyState.briScore * 100).toFixed(0)}%` : '-'}
                </div>
                <p className={styles.companyMetricLabel}>BRI Score</p>
              </div>
              <div className={styles.companyMetric}>
                <div className={styles.companyMetricValue}>
                  {companyState.currentValue !== null ? formatCurrency(companyState.currentValue) : '-'}
                </div>
                <p className={styles.companyMetricLabel}>Current Value</p>
              </div>
              <div className={styles.companyMetric}>
                <div className={styles.companyMetricValue}>
                  {companyState.potentialValue !== null ? formatCurrency(companyState.potentialValue) : '-'}
                </div>
                <p className={styles.companyMetricLabel}>Potential Value</p>
              </div>
              <div className={styles.companyMetric}>
                <div className={styles.companyMetricValue}>
                  {companyState.completedTaskCount}/{companyState.taskCount}
                </div>
                <p className={styles.companyMetricLabel}>Tasks Completed</p>
              </div>
              <div className={styles.companyMetric}>
                <div className={styles.companyMetricValue}>{companyState.assessmentCount}</div>
                <p className={styles.companyMetricLabel}>Assessments</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Journey Timeline</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="details">Account Details</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className={styles.tabContent}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>Recent Activity ({recentEvents.length} events)</p>
              </div>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.tableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>Device</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className={styles.emptyCell}>
                          No events recorded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell style={{ whiteSpace: 'nowrap', fontSize: 14 }}>
                            <span title={new Date(event.createdAt).toLocaleString()}>
                              {timeAgo(event.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={styles.cellMono}>{event.eventName}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={categoryBadgeClass[event.eventCategory] || 'bg-gray-100 text-gray-800'}
                            >
                              {event.eventCategory}
                            </Badge>
                          </TableCell>
                          <TableCell className={styles.cellSecondary}>
                            {event.page || '-'}
                          </TableCell>
                          <TableCell>
                            <div className={styles.breakdownLabel}>
                              <DeviceIcon type={event.deviceType} />
                              <span className={styles.cellSecondary}>{event.browser || '-'}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="devices" className={styles.tabContent}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderInner}>
                  <p className={styles.cardTitle}>Device Types</p>
                </div>
              </div>
              <div className={styles.cardContent}>
                {deviceBreakdown.length === 0 ? (
                  <p className={styles.cellSecondary}>No device data yet</p>
                ) : (
                  <div className={styles.breakdownList}>
                    {deviceBreakdown.map((d) => (
                      <div key={d.deviceType} className={styles.breakdownRow}>
                        <div className={styles.breakdownLabel}>
                          <DeviceIcon type={d.deviceType} />
                          <span>{d.deviceType || 'Unknown'}</span>
                        </div>
                        <span className={styles.breakdownCount}>{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderInner}>
                  <p className={styles.cardTitle}>Browsers</p>
                </div>
              </div>
              <div className={styles.cardContent}>
                {browserBreakdown.length === 0 ? (
                  <p className={styles.cellSecondary}>No browser data yet</p>
                ) : (
                  <div className={styles.breakdownList}>
                    {browserBreakdown.map((b) => (
                      <div key={b.browser} className={styles.breakdownRow}>
                        <span className={styles.cellSecondary}>{b.browser || 'Unknown'}</span>
                        <span className={styles.breakdownCount}>{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className={styles.tabContent}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>Account Info</p>
              </div>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.accountGrid}>
                <div className={styles.accountField}>
                  <p className={styles.accountFieldLabel}>User ID</p>
                  <p className={styles.accountFieldMono}>{user.id}</p>
                </div>
                <div className={styles.accountField}>
                  <p className={styles.accountFieldLabel}>Created</p>
                  <p className={styles.accountFieldValue}>{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <div className={styles.accountField}>
                  <p className={styles.accountFieldLabel}>Email Verified</p>
                  <p className={styles.accountFieldValue}>{user.emailVerified ? 'Yes' : 'No'}</p>
                </div>
                <div className={styles.accountField}>
                  <p className={styles.accountFieldLabel}>User Type</p>
                  <p className={styles.accountFieldValue}>{user.userType}</p>
                </div>
                <div className={styles.accountField}>
                  <p className={styles.accountFieldLabel}>Plan</p>
                  <p className={styles.accountFieldValue}>{user.planTier || 'None'}</p>
                </div>
                <div className={styles.accountField}>
                  <p className={styles.accountFieldLabel}>Subscription Status</p>
                  <p className={styles.accountFieldValue}>{user.subscriptionStatus || '-'}</p>
                </div>
                {user.trialEndsAt && (
                  <div className={styles.accountField}>
                    <p className={styles.accountFieldLabel}>Trial Ends</p>
                    <p className={styles.accountFieldValue}>{new Date(user.trialEndsAt).toLocaleDateString()}</p>
                  </div>
                )}
                <div className={styles.accountField}>
                  <p className={styles.accountFieldLabel}>Super Admin</p>
                  <p className={styles.accountFieldValue}>{user.isSuperAdmin ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
