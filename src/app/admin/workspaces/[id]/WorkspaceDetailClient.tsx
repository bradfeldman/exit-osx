'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatIcbName } from '@/lib/utils/format-icb'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Users, Building2, Save, CreditCard } from 'lucide-react'
import styles from '@/components/admin/admin-misc.module.css'

interface WorkspaceDetailClientProps {
  workspace: {
    id: string
    name: string
    planTier: string
    subscriptionStatus: string
    trialEndsAt: string | null
    createdAt: string
    updatedAt: string
    members: Array<{
      id: string
      workspaceRole: string
      joinedAt: string
      user: {
        id: string
        email: string
        name: string | null
        avatarUrl: string | null
      }
    }>
    companies: Array<{
      id: string
      name: string
      icbIndustry: string
      annualRevenue: string
      createdAt: string
    }>
  }
}

export function WorkspaceDetailClient({ workspace }: WorkspaceDetailClientProps) {
  const router = useRouter()
  const [name, setName] = useState(workspace.name)
  const [planTier, setPlanTier] = useState(workspace.planTier)
  const [subscriptionStatus, setSubscriptionStatus] = useState(workspace.subscriptionStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingPlan, setIsSavingPlan] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePlan = async () => {
    setIsSavingPlan(true)
    try {
      const payload: Record<string, unknown> = {}
      if (planTier !== workspace.planTier) payload.planTier = planTier
      if (subscriptionStatus !== workspace.subscriptionStatus) payload.subscriptionStatus = subscriptionStatus
      if (planTier === 'FOUNDATION' && workspace.planTier !== 'FOUNDATION') {
        payload.trialEndsAt = null
        payload.subscriptionStatus = 'ACTIVE'
        setSubscriptionStatus('ACTIVE')
      }

      const response = await fetch(`/api/admin/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to save plan:', error)
    } finally {
      setIsSavingPlan(false)
    }
  }

  const hasChanges = name !== workspace.name
  const hasPlanChanges = planTier !== workspace.planTier || subscriptionStatus !== workspace.subscriptionStatus

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value))
  }

  return (
    <div className={styles.page}>
      <div className={styles.detailHeader}>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/workspaces">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className={styles.detailHeaderText}>
          <h1 className={styles.detailTitle}>{workspace.name}</h1>
          <p className={styles.detailSubtitle}>
            {workspace.members.length} members, {workspace.companies.length} companies
          </p>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="members">
            Members ({workspace.members.length})
          </TabsTrigger>
          <TabsTrigger value="companies">
            Companies ({workspace.companies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className={styles.tabContent}>
          {/* Workspace details card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>Workspace Details</p>
                <p className={styles.cardDescription}>Edit workspace information</p>
              </div>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.fieldGroup}>
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className={styles.formActions} style={{ marginTop: 16 }}>
                <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>

          {/* Subscription management card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>
                  <CreditCard className="h-5 w-5" />
                  Subscription Management
                </p>
                <p className={styles.cardDescription}>
                  Change plan tier and subscription status
                </p>
              </div>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.formGrid2}>
                <div className={styles.fieldGroup}>
                  <Label>Plan Tier</Label>
                  <Select value={planTier} onValueChange={setPlanTier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOUNDATION">Foundation (Free)</SelectItem>
                      <SelectItem value="GROWTH">Growth ($99/mo)</SelectItem>
                      <SelectItem value="DEAL_ROOM">Deal Room ($208/mo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className={styles.fieldGroup}>
                  <Label>Subscription Status</Label>
                  <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="TRIALING">Trialing</SelectItem>
                      <SelectItem value="PAST_DUE">Past Due</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {workspace.trialEndsAt && (
                <p className={styles.trialNote} style={{ marginTop: 12 }}>
                  Trial ends: {new Date(workspace.trialEndsAt).toLocaleString()}
                </p>
              )}

              <div className={styles.formActions} style={{ marginTop: 16 }}>
                <Button onClick={handleSavePlan} disabled={!hasPlanChanges || isSavingPlan}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingPlan ? 'Saving...' : 'Update Plan'}
                </Button>
              </div>
            </div>
          </div>

          {/* Workspace info card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>Workspace Info</p>
              </div>
            </div>
            <div className={styles.cardContent}>
              <dl className={styles.infoList}>
                <div className={styles.infoRow}>
                  <dt className={styles.infoLabel}>Workspace ID</dt>
                  <dd className={styles.infoValueMono}>{workspace.id}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt className={styles.infoLabel}>Created</dt>
                  <dd className={styles.infoValue}>{new Date(workspace.createdAt).toLocaleString()}</dd>
                </div>
                <div className={styles.infoRow}>
                  <dt className={styles.infoLabel}>Last Updated</dt>
                  <dd className={styles.infoValue}>{new Date(workspace.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>
                  <Users className="h-5 w-5" />
                  Members
                </p>
              </div>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.tableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workspace.members.map((wm) => (
                      <TableRow key={wm.id}>
                        <TableCell>
                          <div>
                            <div className={styles.cellPrimary}>
                              {wm.user.name || 'No name'}
                            </div>
                            <div className={styles.cellSecondary}>
                              {wm.user.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{wm.workspaceRole}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(wm.joinedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/users/${wm.user.id}`}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="companies">
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderInner}>
                <p className={styles.cardTitle}>
                  <Building2 className="h-5 w-5" />
                  Companies
                </p>
              </div>
            </div>
            <div className={styles.cardContent}>
              {workspace.companies.length === 0 ? (
                <p className={styles.pageSubtitle}>No companies in this workspace</p>
              ) : (
                <div className={styles.tableWrap}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Annual Revenue</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workspace.companies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell>
                            <div className={styles.cellPrimary}>{company.name}</div>
                          </TableCell>
                          <TableCell>{formatIcbName(company.icbIndustry)}</TableCell>
                          <TableCell>
                            {formatCurrency(company.annualRevenue)}
                          </TableCell>
                          <TableCell>
                            {new Date(company.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
