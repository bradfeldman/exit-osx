'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
}

const categoryColors: Record<string, string> = {
  auth: 'bg-purple-100 text-purple-800',
  navigation: 'bg-blue-100 text-blue-800',
  onboarding: 'bg-green-100 text-green-800',
  assessment: 'bg-yellow-100 text-yellow-800',
  task: 'bg-orange-100 text-orange-800',
  valuation: 'bg-pink-100 text-pink-800',
  subscription: 'bg-indigo-100 text-indigo-800',
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
}: AnalyticsUserDetailProps) {
  // Calculate engagement status
  const lastEventDate = recentEvents[0]?.createdAt
  const daysSinceActive = lastEventDate
    ? (Date.now() - new Date(lastEventDate).getTime()) / (1000 * 60 * 60 * 24)
    : 999

  let engagementStatus: 'active' | 'stalled' | 'dormant' = 'active'
  if (daysSinceActive > 14) engagementStatus = 'dormant'
  else if (daysSinceActive > 3) engagementStatus = 'stalled'

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    stalled: 'bg-yellow-100 text-yellow-800',
    dormant: 'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/analytics/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant="secondary" className={statusColors[engagementStatus]}>
          {engagementStatus}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{user.eventCount}</div>
            <p className="text-sm text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{user.sessionCount}</div>
            <p className="text-sm text-muted-foreground">Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{user.planTier || 'None'}</div>
            <p className="text-sm text-muted-foreground">Plan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{user.exposureState}</div>
            <p className="text-sm text-muted-foreground">Exposure State</p>
          </CardContent>
        </Card>
      </div>

      {/* Company State */}
      {companyState && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Company: {companyState.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <div className="text-xl font-bold">
                  {companyState.briScore !== null ? `${(companyState.briScore * 100).toFixed(0)}%` : '-'}
                </div>
                <p className="text-sm text-muted-foreground">BRI Score</p>
              </div>
              <div>
                <div className="text-xl font-bold">
                  {companyState.currentValue !== null ? formatCurrency(companyState.currentValue) : '-'}
                </div>
                <p className="text-sm text-muted-foreground">Current Value</p>
              </div>
              <div>
                <div className="text-xl font-bold">
                  {companyState.potentialValue !== null ? formatCurrency(companyState.potentialValue) : '-'}
                </div>
                <p className="text-sm text-muted-foreground">Potential Value</p>
              </div>
              <div>
                <div className="text-xl font-bold">
                  {companyState.completedTaskCount}/{companyState.taskCount}
                </div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
              </div>
              <div>
                <div className="text-xl font-bold">{companyState.assessmentCount}</div>
                <p className="text-sm text-muted-foreground">Assessments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Journey Timeline</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
          <TabsTrigger value="details">Account Details</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity ({recentEvents.length} events)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
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
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No events recorded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            <span title={new Date(event.createdAt).toLocaleString()}>
                              {timeAgo(event.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{event.eventName}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={categoryColors[event.eventCategory] || 'bg-gray-100 text-gray-800'}
                            >
                              {event.eventCategory}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {event.page || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <DeviceIcon type={event.deviceType} />
                              {event.browser || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Device Types</CardTitle>
              </CardHeader>
              <CardContent>
                {deviceBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No device data yet</p>
                ) : (
                  <div className="space-y-3">
                    {deviceBreakdown.map((d) => (
                      <div key={d.deviceType} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DeviceIcon type={d.deviceType} />
                          <span className="text-sm capitalize">{d.deviceType || 'Unknown'}</span>
                        </div>
                        <span className="text-sm font-medium tabular-nums">{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Browsers</CardTitle>
              </CardHeader>
              <CardContent>
                {browserBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No browser data yet</p>
                ) : (
                  <div className="space-y-3">
                    {browserBreakdown.map((b) => (
                      <div key={b.browser} className="flex items-center justify-between">
                        <span className="text-sm">{b.browser || 'Unknown'}</span>
                        <span className="text-sm font-medium tabular-nums">{b.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">{user.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Verified</p>
                  <p className="text-sm">{user.emailVerified ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User Type</p>
                  <p className="text-sm">{user.userType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-sm">{user.planTier || 'None'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscription Status</p>
                  <p className="text-sm">{user.subscriptionStatus || '-'}</p>
                </div>
                {user.trialEndsAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Trial Ends</p>
                    <p className="text-sm">{new Date(user.trialEndsAt).toLocaleDateString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Super Admin</p>
                  <p className="text-sm">{user.isSuperAdmin ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
