'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, User, CheckCircle } from 'lucide-react'
import styles from '@/components/advisor/advisor.module.css'

interface ProfileData {
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  }
  profile: {
    id: string
    firmName: string | null
    specialty: string | null
  } | null
}

const SPECIALTIES = [
  { value: 'CPA', label: 'CPA / Accountant' },
  { value: 'Attorney', label: 'Attorney' },
  { value: 'Wealth Advisor', label: 'Wealth Advisor' },
  { value: 'M&A Advisor', label: 'M&A Advisor' },
  { value: 'Consultant', label: 'Consultant' },
  { value: 'Other', label: 'Other' },
]

export default function AdvisorProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [firmName, setFirmName] = useState('')
  const [specialty, setSpecialty] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const response = await fetch('/api/advisor/profile')
      if (response.ok) {
        const result = await response.json()
        setData(result)
        setFirmName(result.profile?.firmName || '')
        setSpecialty(result.profile?.specialty || '')
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch('/api/advisor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmName,
          specialty,
        }),
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <header className={styles.header}>
          <div className={styles.headerInnerNarrow}>
            <div className={styles.skeletonBar} />
          </div>
        </header>
        <main className={styles.mainNarrow}>
          <div className={styles.loadingBody}>
            <div className={styles.spinner} />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInnerNarrow}>
          <Link href="/advisor">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className={styles.mainNarrow}>
        <div className={styles.pageIntro}>
          <h1 className={styles.pageTitle}>Advisor Profile</h1>
          <p className={styles.pageSubtitle}>
            Manage your professional profile information
          </p>
        </div>

        <div className={styles.sectionStack}>
          {/* Account Info */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>Account Information</p>
              <p className={styles.cardDescription}>
                Your account details from Exit OSx
              </p>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.profileUserRow}>
                <div className={styles.avatarCircleLg}>
                  {data?.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.user.avatarUrl}
                      alt={data.user.name || 'Avatar'}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <User style={{ width: 32, height: 32 }} />
                  )}
                </div>
                <div className={styles.profileUserInfo}>
                  <p>{data?.user.name || 'No name set'}</p>
                  <p>{data?.user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Info */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <p className={styles.cardTitle}>Professional Information</p>
              <p className={styles.cardDescription}>
                This information is displayed to your clients
              </p>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.fieldGroupStack}>
                <div className={styles.fieldGroup}>
                  <Label htmlFor="firmName">Firm Name</Label>
                  <Input
                    id="firmName"
                    placeholder="Enter your firm or company name"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger id="specialty">
                      <SelectValue placeholder="Select your specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={styles.saveRow}>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {saved && (
                    <span className={styles.savedConfirmation}>
                      <CheckCircle style={{ width: 16, height: 16 }} />
                      Saved
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
