'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatIcbName } from '@/lib/utils/format-icb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/workspaces">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <p className="text-muted-foreground">
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

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace Details</CardTitle>
              <CardDescription>
                Edit workspace information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Management
              </CardTitle>
              <CardDescription>
                Change plan tier and subscription status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan Tier</Label>
                  <Select value={planTier} onValueChange={setPlanTier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOUNDATION">Foundation (Free)</SelectItem>
                      <SelectItem value="GROWTH">Growth ($149/mo)</SelectItem>
                      <SelectItem value="DEAL_ROOM">Deal Room ($379/mo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
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
                <div className="text-sm text-muted-foreground">
                  Trial ends: {new Date(workspace.trialEndsAt).toLocaleString()}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSavePlan} disabled={!hasPlanChanges || isSavingPlan}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSavingPlan ? 'Saving...' : 'Update Plan'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Workspace Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Workspace ID</dt>
                  <dd className="font-mono">{workspace.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(workspace.createdAt).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd>{new Date(workspace.updatedAt).toLocaleString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                          <div className="font-medium">
                            {wm.user.name || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.companies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No companies in this workspace
                </p>
              ) : (
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
                          <div className="font-medium">{company.name}</div>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
