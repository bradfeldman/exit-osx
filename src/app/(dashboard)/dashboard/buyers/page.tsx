'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/playbook/playbook.module.css'

interface BuyerContact {
  firstName: string
  lastName: string
  email: string
  isPrimary: boolean
}

interface Buyer {
  id: string
  name: string
  buyerType: string
  currentStage: string
  tier: string
  location: string | null
  industry: string | null
  description: string | null
  stageUpdatedAt: string
  contacts: BuyerContact[]
  prospect: { relevanceDescription: string | null } | null
  _count: { documents: number; meetings: number; activities: number }
}

const TYPE_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  FINANCIAL: 'PE',
  INDIVIDUAL: 'Individual',
  MANAGEMENT: 'Management',
  ESOP: 'ESOP',
  OTHER: 'Other',
}

const TYPE_BADGE_CLASS: Record<string, string> = {
  STRATEGIC: 'typeStrategic',
  FINANCIAL: 'typePe',
  INDIVIDUAL: 'typeIndividual',
  MANAGEMENT: 'typeFamily',
  ESOP: 'typeFinancial',
  OTHER: 'typeFinancial',
}

const AVATAR_CLASS: Record<string, string> = {
  STRATEGIC: 'avatarStrategic',
  FINANCIAL: 'avatarPe',
  INDIVIDUAL: 'avatarIndividual',
  MANAGEMENT: 'avatarFamily',
  ESOP: 'avatarPe',
  OTHER: 'avatarPe',
}

const STAGE_LABELS: Record<string, string> = {
  IDENTIFIED: 'New',
  INITIAL_CONTACT: 'Contacted',
  NDA_SIGNED: 'NDA Signed',
  CIM_SENT: 'CIM Sent',
  MEETING_SCHEDULED: 'Meeting',
  LOI_SUBMITTED: 'LOI Received',
  LOI_NEGOTIATION: 'LOI Negotiation',
  DUE_DILIGENCE: 'Due Diligence',
  CLOSING: 'Closing',
  CLOSED: 'Closed',
  DECLINED: 'Declined',
  ON_HOLD: 'On Hold',
}

const STAGE_BADGE_CLASS: Record<string, string> = {
  IDENTIFIED: 'stageNew',
  INITIAL_CONTACT: 'stageContacted',
  NDA_SIGNED: 'stageNda',
  CIM_SENT: 'stageContacted',
  MEETING_SCHEDULED: 'stageContacted',
  LOI_SUBMITTED: 'stageLoi',
  LOI_NEGOTIATION: 'stageLoi',
  DUE_DILIGENCE: 'stageDd',
  CLOSING: 'stageDd',
  CLOSED: 'stageDd',
  DECLINED: 'stageDeclined',
  ON_HOLD: 'stageIdentified',
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function BuyersPage() {
  const { selectedCompanyId } = useCompany()
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({})
  const [typeFilter, setTypeFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedCompanyId) return
    let cancelled = false

    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (stageFilter !== 'all') params.set('stage', stageFilter)
    if (search) params.set('search', search)

    fetch(`/api/companies/${selectedCompanyId}/deal-tracker?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return
        setBuyers(data.buyers || [])
        setStageCounts(data.stageCounts || {})
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedCompanyId, typeFilter, stageFilter, search])

  const totalBuyers = buyers.length
  const activeConversations = buyers.filter(b => !['IDENTIFIED', 'DECLINED', 'ON_HOLD'].includes(b.currentStage)).length
  const ndaSigned = buyers.filter(b => ['NDA_SIGNED', 'CIM_SENT', 'MEETING_SCHEDULED', 'LOI_SUBMITTED', 'LOI_NEGOTIATION', 'DUE_DILIGENCE', 'CLOSING', 'CLOSED'].includes(b.currentStage)).length
  const loisReceived = buyers.filter(b => ['LOI_SUBMITTED', 'LOI_NEGOTIATION'].includes(b.currentStage)).length

  // Type counts
  const typeCounts: Record<string, number> = {}
  for (const b of buyers) {
    typeCounts[b.buyerType] = (typeCounts[b.buyerType] || 0) + 1
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <>
      <TrackPageView page="/dashboard/buyers" />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Buyers</h1>
          <p>Track and manage prospective acquirers for your business</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
            Import CSV
          </button>
          <Link href="/dashboard/buyers/add" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Buyer
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Prospects</div>
          <div className={styles.statValue}>{totalBuyers}</div>
          <div className={styles.statSub}>Across {Object.keys(typeCounts).length} buyer types</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Conversations</div>
          <div className={styles.statValue} style={{ color: 'var(--accent)' }}>{activeConversations}</div>
          <div className={styles.statSub}>Contacted or further</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>NDAs Signed</div>
          <div className={styles.statValue} style={{ color: 'var(--orange)' }}>{ndaSigned}</div>
          <div className={styles.statSub}>Have access to financials</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>LOIs Received</div>
          <div className={styles.statValue} style={{ color: 'var(--green)' }}>{loisReceived}</div>
          <div className={styles.statSub}>{loisReceived > 0 ? 'Active offers' : 'None yet'}</div>
        </div>
      </div>

      {/* AI Match Banner */}
      {totalBuyers > 0 && (
        <div className={styles.matchBanner}>
          <div className={styles.matchIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>
          </div>
          <div className={styles.matchContent}>
            <div className={styles.matchTitle}>AI Buyer Matching</div>
            <div className={styles.matchDesc}>
              Your {totalBuyers} prospects have been scored against your company profile. Use tier ratings and stage tracking to prioritize outreach.
            </div>
          </div>
          <div className={styles.matchBadge}>{totalBuyers} Prospects</div>
        </div>
      )}

      {/* Filter Bar */}
      <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}>All Prospects</h2></div>
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <button className={`${styles.filterBtn} ${typeFilter === 'all' ? styles.filterBtnActive : ''}`} onClick={() => setTypeFilter('all')}>
            All ({totalBuyers})
          </button>
          {Object.entries(typeCounts).map(([type, count]) => (
            <button key={type} className={`${styles.filterBtn} ${typeFilter === type ? styles.filterBtnActive : ''}`} onClick={() => setTypeFilter(type)}>
              {TYPE_LABELS[type] || type} ({count})
            </button>
          ))}
        </div>
        <div className={styles.filterSearch}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search buyers..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Buyer Table */}
      {buyers.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '60px 40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No buyers found. Add your first prospect to start tracking.</p>
          <Link href="/dashboard/buyers/add" className={styles.sectionLink} style={{ marginTop: '8px', display: 'inline-block' }}>
            Add Buyer
          </Link>
        </div>
      ) : (
        <div className={styles.buyerTableWrap}>
          <table className={styles.buyerTable}>
            <thead>
              <tr>
                <th>Buyer</th>
                <th>Type</th>
                <th>Tier</th>
                <th>Stage</th>
                <th>Contact</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map(buyer => {
                const avatarClass = AVATAR_CLASS[buyer.buyerType] || 'avatarPe'
                const typeBadgeClass = TYPE_BADGE_CLASS[buyer.buyerType] || 'typePe'
                const stageBadgeClass = STAGE_BADGE_CLASS[buyer.currentStage] || 'stageNew'
                const primaryContact = buyer.contacts.find(c => c.isPrimary) || buyer.contacts[0]
                const isDeclined = buyer.currentStage === 'DECLINED'

                return (
                  <tr key={buyer.id} style={isDeclined ? { opacity: 0.5 } : undefined}>
                    <td>
                      <Link href={`/dashboard/buyers/${buyer.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className={styles.buyerNameCell}>
                          <div className={`${styles.buyerAvatar} ${styles[avatarClass]}`}>
                            {getInitials(buyer.name)}
                          </div>
                          <div>
                            <div className={styles.buyerName}>{buyer.name}</div>
                            <div className={styles.buyerCompany}>
                              {TYPE_LABELS[buyer.buyerType] || buyer.buyerType}
                              {buyer.location ? ` · ${buyer.location}` : ''}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className={`${styles.buyerTypeBadge} ${styles[typeBadgeClass]}`}>
                        {TYPE_LABELS[buyer.buyerType] || buyer.buyerType}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>
                      {buyer.tier.replace('_TIER', '').replace('_', ' ')}
                    </td>
                    <td>
                      <span className={`${styles.stageBadge} ${styles[stageBadgeClass]}`}>
                        {STAGE_LABELS[buyer.currentStage] || buyer.currentStage}
                      </span>
                    </td>
                    <td>
                      {primaryContact ? (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {primaryContact.firstName} {primaryContact.lastName}
                          <br />
                          <span style={{ color: 'var(--text-tertiary)' }}>{primaryContact.email}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No contact</span>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {timeAgo(buyer.stageUpdatedAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
