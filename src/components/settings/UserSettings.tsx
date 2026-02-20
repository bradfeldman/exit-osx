'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserAvatar } from '@/components/ui/user-avatar'
import { GDPRSettings } from '@/components/settings/GDPRSettings'
import { TwoFactorSettings } from '@/components/security/two-factor-settings'
import { SessionManager } from '@/components/security/session-manager'
import styles from './settings.module.css'

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
      <div className={styles.loadingCenter}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Profile</h2>
          <p className={styles.cardDescription}>Your personal account information</p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.fieldStack}>
            <div className={styles.profileRow}>
              <UserAvatar
                email={user?.email || ''}
                name={user?.name || undefined}
                size="lg"
              />
              <div>
                <p className={styles.profileName}>{user?.name || 'No name set'}</p>
                <p className={styles.profileEmail}>{user?.email}</p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className={styles.formGroup}>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className={styles.formHint}>
                Email cannot be changed
              </p>
            </div>

            {message && (
              <div className={message.type === 'success' ? styles.messageSuccess : styles.messageError}>
                {message.text}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <h2 className={styles.sectionTitle}>Security</h2>
      <div className={styles.fieldStack}>
        <TwoFactorSettings />

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Active Sessions</h2>
            <p className={styles.cardDescription}>
              Manage devices where you&apos;re signed in
            </p>
          </div>
          <div className={styles.cardContent}>
            <SessionManager />
          </div>
        </div>
      </div>

      {/* GDPR Settings */}
      <GDPRSettings />
    </div>
  )
}
