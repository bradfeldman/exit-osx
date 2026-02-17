'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/ui/user-avatar'
import { GDPRSettings } from '@/components/settings/GDPRSettings'
import { TwoFactorSettings } from '@/components/security/two-factor-settings'
import { SessionManager } from '@/components/security/session-manager'

export function UserSettings() {
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        let dbName: string | null = null
        try {
          const response = await fetch('/api/user/profile')
          if (response.ok) {
            const data = await response.json()
            dbName = data.name || null
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error)
        }

        // Default to email prefix (text before @) if no name set
        const emailPrefix = authUser.email ? authUser.email.split('@')[0] : null
        const displayName = dbName || authUser.user_metadata?.name || emailPrefix || null
        setUser({
          email: authUser.email || '',
          name: displayName,
        })
        setName(displayName || '')
      }
      setLoading(false)
    }
    loadUser()
  }, [supabase.auth])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const [authResult, dbResult] = await Promise.all([
        supabase.auth.updateUser({ data: { name } }),
        fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }),
      ])

      if (authResult.error) throw authResult.error
      if (!dbResult.ok) {
        const errorData = await dbResult.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      setUser(prev => prev ? { ...prev, name } : null)
      setMessage({ type: 'success', text: 'Profile updated successfully' })
      // Re-run the server layout so the header picks up the new name
      router.refresh()
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <UserAvatar
              email={user?.email || ''}
              name={user?.name || undefined}
              size="lg"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name || 'No name set'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              Email cannot be changed
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <div className="pt-6 border-t">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>
        <div className="space-y-6">
          <TwoFactorSettings />

          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage devices where you&apos;re signed in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionManager />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* GDPR Settings */}
      <GDPRSettings />
    </div>
  )
}
