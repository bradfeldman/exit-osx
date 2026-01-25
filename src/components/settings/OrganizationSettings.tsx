'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { UserAvatar } from '@/components/ui/user-avatar'
import { UserRole, FunctionalCategory } from '@prisma/client'
import {
  ChevronDown,
  ChevronRight,
  Crown,
  Calculator,
  Settings,
  Users,
  Scale,
  Megaphone,
  Monitor,
  UserCheck,
  Briefcase,
  Wallet,
  Handshake,
  Eye,
  User,
  Lock,
  Shield,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'

// Types
interface Member {
  id: string
  role: UserRole
  functionalCategories: FunctionalCategory[]
  joinedAt: string
  isExternalAdvisor: boolean
  roleTemplate?: {
    id: string
    slug: string
    name: string
    icon: string
  } | null
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
}

interface Invite {
  id: string
  email: string
  role: UserRole
  functionalCategories: FunctionalCategory[]
  createdAt: string
  expiresAt: string
  isExternalAdvisor: boolean
  roleTemplate?: {
    id: string
    slug: string
    name: string
    icon: string
  } | null
}

interface Organization {
  id: string
  name: string
  currentUserRole: UserRole
  users: Member[]
  invites: Invite[]
}

interface RoleTemplate {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  isBuiltIn: boolean
  defaultPermissions: Record<string, boolean>
  summary: {
    fullAccess: string[]
    viewOnly: string[]
    noAccess: string[]
  }
}

interface PermissionCategory {
  key: string
  label: string
  icon: string
  sensitive: boolean
  permissions: string[]
}

// Constants
const categoryLabels: Record<FunctionalCategory, string> = {
  OWNER: 'Owner',
  FINANCE: 'Finance',
  OPERATIONS: 'Operations',
  HR: 'HR',
  LEGAL: 'Legal',
  SALES_MARKETING: 'Sales & Marketing',
  IT: 'IT',
  EXTERNAL: 'External Advisor',
}

const categoryIcons: Record<FunctionalCategory, React.ElementType> = {
  OWNER: Crown,
  FINANCE: Calculator,
  OPERATIONS: Settings,
  HR: Users,
  LEGAL: Scale,
  SALES_MARKETING: Megaphone,
  IT: Monitor,
  EXTERNAL: UserCheck,
}

const categoryColors: Record<FunctionalCategory, string> = {
  OWNER: 'bg-amber-100 text-amber-800 border-amber-200',
  FINANCE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  OPERATIONS: 'bg-blue-100 text-blue-800 border-blue-200',
  HR: 'bg-purple-100 text-purple-800 border-purple-200',
  LEGAL: 'bg-slate-100 text-slate-800 border-slate-200',
  SALES_MARKETING: 'bg-pink-100 text-pink-800 border-pink-200',
  IT: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  EXTERNAL: 'bg-orange-100 text-orange-800 border-orange-200',
}

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEAM_LEADER: 'Team Leader',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}

const roleBadgeVariant: Record<UserRole, 'default' | 'secondary' | 'outline'> = {
  SUPER_ADMIN: 'default',
  ADMIN: 'default',
  TEAM_LEADER: 'secondary',
  MEMBER: 'secondary',
  VIEWER: 'outline',
}

const templateIcons: Record<string, React.ElementType> = {
  crown: Crown,
  calculator: Calculator,
  scale: Scale,
  wallet: Wallet,
  handshake: Handshake,
  briefcase: Briefcase,
  user: User,
  eye: Eye,
}

export function OrganizationSettings() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  // Invite form state
  const [inviteStep, setInviteStep] = useState(1)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('MEMBER')
  const [inviteCategories, setInviteCategories] = useState<FunctionalCategory[]>([])
  const [isExternalAdvisor, setIsExternalAdvisor] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [customizePermissions, setCustomizePermissions] = useState(false)
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({})

  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [updatingCategories, setUpdatingCategories] = useState<string | null>(null)

  // Role templates
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([])
  const [permissionCategories, setPermissionCategories] = useState<PermissionCategory[]>([])

  useEffect(() => {
    loadOrganization()
    loadRoleTemplates()
  }, [])

  async function loadOrganization() {
    try {
      const response = await fetch('/api/organizations')
      if (response.ok) {
        const data = await response.json()
        if (data.organizations.length > 0) {
          setOrganization(data.organizations[0])
        }
      }
    } catch (error) {
      console.error('Failed to load organization:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadRoleTemplates() {
    try {
      const response = await fetch('/api/role-templates')
      if (response.ok) {
        const data = await response.json()
        setRoleTemplates(data.templates)
        setPermissionCategories(data.categories)
      }
    } catch (error) {
      console.error('Failed to load role templates:', error)
    }
  }

  function resetInviteForm() {
    setInviteStep(1)
    setInviteEmail('')
    setInviteRole('MEMBER')
    setInviteCategories([])
    setIsExternalAdvisor(false)
    setSelectedTemplateId(null)
    setCustomizePermissions(false)
    setCustomPermissions({})
    setInviteError(null)
    setInviteUrl(null)
    setInviteCopied(false)
  }

  async function handleInvite() {
    if (!organization || !inviteEmail) return

    setInviting(true)
    setInviteError(null)
    setInviteUrl(null)

    try {
      // Build custom permissions array if customizing
      const customPermsArray = customizePermissions
        ? Object.entries(customPermissions)
            .filter(([, value]) => value !== undefined)
            .map(([permission, granted]) => ({ permission, granted }))
        : undefined

      const response = await fetch(`/api/organizations/${organization.id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          functionalCategories: inviteCategories,
          roleTemplateId: selectedTemplateId,
          customPermissions: customPermsArray,
          isExternalAdvisor,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invite')
        return
      }

      setInviteUrl(data.invite.inviteUrl)
      loadOrganization()
    } catch {
      setInviteError('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleCategoryChange(userId: string, categories: FunctionalCategory[]) {
    if (!organization) return

    setUpdatingCategories(userId)

    try {
      const response = await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, functionalCategories: categories }),
      })

      if (response.ok) {
        loadOrganization()
      }
    } catch (error) {
      console.error('Failed to update categories:', error)
    } finally {
      setUpdatingCategories(null)
    }
  }

  function toggleInviteCategory(category: FunctionalCategory) {
    setInviteCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    if (!organization) return

    try {
      const response = await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      })

      if (response.ok) {
        loadOrganization()
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!organization) return
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(
        `/api/organizations/${organization.id}/members?userId=${userId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadOrganization()
      }
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  async function handleCancelInvite(inviteId: string) {
    if (!organization) return

    try {
      const response = await fetch(
        `/api/organizations/${organization.id}/invites?inviteId=${inviteId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        loadOrganization()
      }
    } catch (error) {
      console.error('Failed to cancel invite:', error)
    }
  }

  function openPermissionsDialog(member: Member) {
    setSelectedMember(member)
    setPermissionsDialogOpen(true)
  }

  const canManageMembers = organization?.currentUserRole === 'ADMIN' || organization?.currentUserRole === 'SUPER_ADMIN'
  const canInvite = canManageMembers || organization?.currentUserRole === 'TEAM_LEADER'

  const selectedTemplate = roleTemplates.find(t => t.id === selectedTemplateId)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    )
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No organization found
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Members Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              {organization.users.length} member{organization.users.length !== 1 ? 's' : ''} in {organization.name}
            </CardDescription>
          </div>
          {canInvite && (
            <Dialog
              open={inviteDialogOpen}
              onOpenChange={(open) => {
                setInviteDialogOpen(open)
                if (!open) resetInviteForm()
              }}
            >
              <DialogTrigger asChild>
                <Button>Invite Member</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {inviteUrl ? 'Invite Sent!' : `Invite Team Member - Step ${inviteStep} of 3`}
                  </DialogTitle>
                  <DialogDescription>
                    {inviteUrl
                      ? 'Share the invite link below'
                      : inviteStep === 1
                        ? 'Enter email and member type'
                        : inviteStep === 2
                          ? 'Select a role template'
                          : 'Customize permissions (optional)'
                    }
                  </DialogDescription>
                </DialogHeader>

                {inviteUrl ? (
                  <div className="py-4 space-y-4">
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Share this invite link:
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={inviteUrl}
                          className="font-mono text-sm"
                          onClick={(e) => e.currentTarget.select()}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={async () => {
                            await navigator.clipboard.writeText(inviteUrl)
                            setInviteCopied(true)
                            setTimeout(() => setInviteCopied(false), 2000)
                          }}
                          className="shrink-0"
                        >
                          {inviteCopied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      An email has also been sent to {inviteEmail}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Step 1: Basic Info */}
                    {inviteStep === 1 && (
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="colleague@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Member Type</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setIsExternalAdvisor(false)}
                              className={`p-4 border rounded-lg text-left transition-colors ${
                                !isExternalAdvisor
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <Users className="h-5 w-5 mb-2" />
                              <div className="font-medium">Internal Team</div>
                              <p className="text-xs text-muted-foreground">
                                Employee or internal stakeholder
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsExternalAdvisor(true)}
                              className={`p-4 border rounded-lg text-left transition-colors ${
                                isExternalAdvisor
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <ExternalLink className="h-5 w-5 mb-2" />
                              <div className="font-medium">External Advisor</div>
                              <p className="text-xs text-muted-foreground">
                                CPA, attorney, consultant
                              </p>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="role">System Role</Label>
                          <Select
                            value={inviteRole}
                            onValueChange={(value) => setInviteRole(value as UserRole)}
                          >
                            <SelectTrigger id="role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                              <SelectItem value="MEMBER">Member</SelectItem>
                              <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            This controls basic system access. Granular permissions are set in the next step.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Role Template */}
                    {inviteStep === 2 && (
                      <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3">
                          {roleTemplates
                            .filter(t => isExternalAdvisor
                              ? ['cpa', 'attorney', 'wealth_advisor', 'ma_advisor', 'consultant'].includes(t.slug)
                              : ['owner', 'internal_team', 'view_only'].includes(t.slug)
                            )
                            .map((template) => {
                              const Icon = templateIcons[template.icon] || User
                              const isSelected = selectedTemplateId === template.id
                              return (
                                <button
                                  key={template.id}
                                  type="button"
                                  onClick={() => setSelectedTemplateId(template.id)}
                                  className={`p-4 border rounded-lg text-left transition-colors ${
                                    isSelected
                                      ? 'border-primary bg-primary/5'
                                      : 'hover:bg-muted'
                                  }`}
                                >
                                  <Icon className="h-5 w-5 mb-2" />
                                  <div className="font-medium">{template.name}</div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {template.description}
                                  </p>
                                  {template.summary && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {template.summary.fullAccess.slice(0, 3).map(m => (
                                        <Badge key={m} variant="secondary" className="text-xs">
                                          {m}
                                        </Badge>
                                      ))}
                                      {template.summary.fullAccess.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{template.summary.fullAccess.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </button>
                              )
                            })}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Customize Permissions */}
                    {inviteStep === 3 && (
                      <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Customize Permissions</Label>
                            <p className="text-xs text-muted-foreground">
                              Override template defaults for specific permissions
                            </p>
                          </div>
                          <Switch
                            checked={customizePermissions}
                            onCheckedChange={setCustomizePermissions}
                          />
                        </div>

                        {customizePermissions && selectedTemplate && (
                          <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-3">
                            {permissionCategories.map((category) => (
                              <Collapsible key={category.key}>
                                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded">
                                  <ChevronRight className="h-4 w-4" />
                                  <span className="font-medium">{category.label}</span>
                                  {category.sensitive && (
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </CollapsibleTrigger>
                                <CollapsibleContent className="pl-6 space-y-1">
                                  {category.permissions.map((perm) => {
                                    const defaultValue = selectedTemplate.defaultPermissions[perm] ?? false
                                    const customValue = customPermissions[perm]
                                    const currentValue = customValue !== undefined ? customValue : defaultValue
                                    const isOverridden = customValue !== undefined

                                    return (
                                      <div
                                        key={perm}
                                        className={`flex items-center justify-between p-2 rounded ${
                                          isOverridden ? 'bg-amber-50' : ''
                                        }`}
                                      >
                                        <span className="text-sm">{perm.split(':')[1]}</span>
                                        <div className="flex items-center gap-2">
                                          {isOverridden && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newPerms = { ...customPermissions }
                                                delete newPerms[perm]
                                                setCustomPermissions(newPerms)
                                              }}
                                              className="text-xs text-muted-foreground hover:text-foreground"
                                            >
                                              Reset
                                            </button>
                                          )}
                                          <Switch
                                            checked={currentValue}
                                            onCheckedChange={(checked) => {
                                              setCustomPermissions({
                                                ...customPermissions,
                                                [perm]: checked,
                                              })
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )
                                  })}
                                </CollapsibleContent>
                              </Collapsible>
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Functional Categories (Optional)</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Used to default task assignments
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(categoryLabels) as FunctionalCategory[]).map((category) => {
                              const Icon = categoryIcons[category]
                              return (
                                <div
                                  key={category}
                                  className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                                    inviteCategories.includes(category)
                                      ? categoryColors[category]
                                      : 'bg-background hover:bg-muted'
                                  }`}
                                  onClick={() => toggleInviteCategory(category)}
                                >
                                  <Checkbox
                                    checked={inviteCategories.includes(category)}
                                    onCheckedChange={() => toggleInviteCategory(category)}
                                  />
                                  <Icon className="h-4 w-4" />
                                  <span className="text-sm">{categoryLabels[category]}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}

                <DialogFooter>
                  {inviteUrl ? (
                    <Button onClick={() => setInviteDialogOpen(false)}>
                      Close
                    </Button>
                  ) : (
                    <>
                      {inviteStep > 1 && (
                        <Button
                          variant="outline"
                          onClick={() => setInviteStep(inviteStep - 1)}
                        >
                          Back
                        </Button>
                      )}
                      {inviteStep < 3 ? (
                        <Button
                          onClick={() => setInviteStep(inviteStep + 1)}
                          disabled={
                            (inviteStep === 1 && !inviteEmail) ||
                            (inviteStep === 2 && !selectedTemplateId)
                          }
                        >
                          Next
                        </Button>
                      ) : (
                        <Button onClick={handleInvite} disabled={inviting}>
                          {inviting ? 'Sending...' : 'Send Invite'}
                        </Button>
                      )}
                    </>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Joined</TableHead>
                {canManageMembers && <TableHead className="w-[100px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {organization.users.map((member) => {
                const TemplateIcon = member.roleTemplate?.icon
                  ? templateIcons[member.roleTemplate.icon] || Shield
                  : Shield
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          email={member.user.email}
                          name={member.user.name || undefined}
                          size="sm"
                        />
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {member.user.name || 'No name'}
                            {member.isExternalAdvisor && (
                              <Badge variant="outline" className="text-xs">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Advisor
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManageMembers && member.role !== 'SUPER_ADMIN' ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(member.user.id, value as UserRole)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="TEAM_LEADER">Team Leader</SelectItem>
                            <SelectItem value="MEMBER">Member</SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={roleBadgeVariant[member.role]}>
                          {roleLabels[member.role]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.roleTemplate ? (
                        <button
                          onClick={() => canManageMembers && openPermissionsDialog(member)}
                          className={`flex items-center gap-2 px-2 py-1 rounded border ${
                            canManageMembers ? 'hover:bg-muted cursor-pointer' : ''
                          }`}
                        >
                          <TemplateIcon className="h-4 w-4" />
                          <span className="text-sm">{member.roleTemplate.name}</span>
                          {canManageMembers && <ChevronDown className="h-3 w-3" />}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {member.role === 'SUPER_ADMIN' || member.role === 'ADMIN'
                            ? 'Full Access'
                            : 'Default'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManageMembers ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-auto min-h-[32px] py-1 px-2"
                              disabled={updatingCategories === member.user.id}
                            >
                              {member.functionalCategories.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {member.functionalCategories.map((cat) => {
                                    const Icon = categoryIcons[cat]
                                    return (
                                      <span
                                        key={cat}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${categoryColors[cat]}`}
                                      >
                                        <Icon className="h-3 w-3" />
                                        {categoryLabels[cat]}
                                      </span>
                                    )
                                  })}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">Assign categories...</span>
                              )}
                              <ChevronDown className="ml-1 h-3 w-3 shrink-0" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="start">
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground mb-2 px-1">
                                Select functional areas
                              </p>
                              {(Object.keys(categoryLabels) as FunctionalCategory[]).map((category) => {
                                const Icon = categoryIcons[category]
                                const isSelected = member.functionalCategories.includes(category)
                                return (
                                  <div
                                    key={category}
                                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                      isSelected
                                        ? categoryColors[category]
                                        : 'hover:bg-muted'
                                    }`}
                                    onClick={() => {
                                      const newCategories = isSelected
                                        ? member.functionalCategories.filter(c => c !== category)
                                        : [...member.functionalCategories, category]
                                      handleCategoryChange(member.user.id, newCategories)
                                    }}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => {
                                        const newCategories = isSelected
                                          ? member.functionalCategories.filter(c => c !== category)
                                          : [...member.functionalCategories, category]
                                        handleCategoryChange(member.user.id, newCategories)
                                      }}
                                    />
                                    <Icon className="h-4 w-4" />
                                    <span className="text-sm">{categoryLabels[category]}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {member.functionalCategories.length > 0 ? (
                            member.functionalCategories.map((cat) => {
                              const Icon = categoryIcons[cat]
                              return (
                                <span
                                  key={cat}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${categoryColors[cat]}`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {categoryLabels[cat]}
                                </span>
                              )
                            })
                          ) : (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                    {canManageMembers && (
                      <TableCell>
                        {member.role !== 'SUPER_ADMIN' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.user.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {canInvite && organization.invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>
              {organization.invites.length} pending invite{organization.invites.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permission Template</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.invites.map((invite) => {
                  const TemplateIcon = invite.roleTemplate?.icon
                    ? templateIcons[invite.roleTemplate.icon] || Shield
                    : Shield
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {invite.email}
                          {invite.isExternalAdvisor && (
                            <Badge variant="outline" className="text-xs">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Advisor
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariant[invite.role]}>
                          {roleLabels[invite.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invite.roleTemplate ? (
                          <div className="flex items-center gap-2">
                            <TemplateIcon className="h-4 w-4" />
                            <span className="text-sm">{invite.roleTemplate.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {invite.functionalCategories.length > 0 ? (
                            invite.functionalCategories.map((cat) => {
                              const Icon = categoryIcons[cat]
                              return (
                                <span
                                  key={cat}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${categoryColors[cat]}`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {categoryLabels[cat]}
                                </span>
                              )
                            })
                          ) : (
                            <span className="text-muted-foreground text-xs">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Permissions for {selectedMember?.user.name || selectedMember?.user.email}
            </DialogTitle>
            <DialogDescription>
              View and customize this member&apos;s access permissions
            </DialogDescription>
          </DialogHeader>
          {selectedMember && (
            <MemberPermissionsEditor
              organizationId={organization.id}
              member={selectedMember}
              roleTemplates={roleTemplates}
              permissionCategories={permissionCategories}
              onClose={() => {
                setPermissionsDialogOpen(false)
                loadOrganization()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Separate component for managing member permissions
function MemberPermissionsEditor({
  organizationId,
  member,
  roleTemplates,
  permissionCategories,
  onClose,
}: {
  organizationId: string
  member: Member
  roleTemplates: RoleTemplate[]
  permissionCategories: PermissionCategory[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [_permissions, setPermissions] = useState<{
    resolvedPermissions: Record<string, boolean>
    customPermissions: Array<{ permission: string; granted: boolean }>
  } | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    member.roleTemplate?.id || null
  )
  const [customOverrides, setCustomOverrides] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadPermissions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadPermissions() {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members/${member.id}/permissions`
      )
      if (response.ok) {
        const data = await response.json()
        setPermissions(data)
        // Initialize custom overrides from existing data
        const overrides: Record<string, boolean> = {}
        for (const perm of data.customPermissions) {
          overrides[perm.permission] = perm.granted
        }
        setCustomOverrides(overrides)
      }
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const customPermsArray = Object.entries(customOverrides).map(
        ([permission, granted]) => ({ permission, granted })
      )

      await fetch(
        `/api/organizations/${organizationId}/members/${member.id}/permissions`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roleTemplateId: selectedTemplateId,
            customPermissions: customPermsArray,
          }),
        }
      )

      onClose()
    } catch (error) {
      console.error('Failed to save permissions:', error)
    } finally {
      setSaving(false)
    }
  }

  const selectedTemplate = roleTemplates.find(t => t.id === selectedTemplateId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Role Template</Label>
        <Select
          value={selectedTemplateId || ''}
          onValueChange={(value) => {
            setSelectedTemplateId(value || null)
            setCustomOverrides({}) // Reset overrides when changing template
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role template" />
          </SelectTrigger>
          <SelectContent>
            {roleTemplates.map((template) => {
              const Icon = templateIcons[template.icon] || User
              return (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {template.name}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {selectedTemplate && (
        <div className="space-y-2">
          <Label>Permission Overrides</Label>
          <p className="text-xs text-muted-foreground">
            Toggle permissions to override the template defaults
          </p>
          <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-3">
            {permissionCategories.map((category) => (
              <Collapsible key={category.key}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded">
                  <ChevronRight className="h-4 w-4" />
                  <span className="font-medium">{category.label}</span>
                  {category.sensitive && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 space-y-1">
                  {category.permissions.map((perm) => {
                    const defaultValue = selectedTemplate.defaultPermissions[perm] ?? false
                    const customValue = customOverrides[perm]
                    const currentValue = customValue !== undefined ? customValue : defaultValue
                    const isOverridden = customValue !== undefined

                    return (
                      <div
                        key={perm}
                        className={`flex items-center justify-between p-2 rounded ${
                          isOverridden ? 'bg-amber-50' : ''
                        }`}
                      >
                        <span className="text-sm">{perm}</span>
                        <div className="flex items-center gap-2">
                          {isOverridden && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOverrides = { ...customOverrides }
                                delete newOverrides[perm]
                                setCustomOverrides(newOverrides)
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              Reset
                            </button>
                          )}
                          <Switch
                            checked={currentValue}
                            onCheckedChange={(checked) => {
                              setCustomOverrides({
                                ...customOverrides,
                                [perm]: checked,
                              })
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
