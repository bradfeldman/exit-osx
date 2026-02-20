'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useCompany } from '@/contexts/CompanyContext'
import { TrackPageView } from '@/components/tracking/TrackPageView'
import styles from '@/components/deal-room/deal-room.module.css'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PipelineBuyer {
  id: string
  companyName: string
  buyerType: string
  tier: string
  currentStage: string
  stageLabel: string
  stageUpdatedAt: string
  primaryContact: { name: string; email: string; title: string } | null
  loiAmount: number | null
  ioiAmount: number | null
  engagementLevel: string
  lastActivity: string | null
}

interface PipelineStage {
  visualStage: string
  label: string
  buyerCount: number
  buyers: PipelineBuyer[]
}

interface DealRoomData {
  activation: {
    isActivated: boolean
    evidenceScore: number
    canActivate: boolean
    activatedAt: string | null
  }
  deal: {
    id: string
    codeName: string
    status: string
    startedAt: string
    targetCloseDate: string | null
  } | null
  pipeline: {
    totalBuyers: number
    activeBuyers: number
    stages: PipelineStage[]
  } | null
  offers: Array<{
    buyerId: string
    companyName: string
    offerType: 'IOI' | 'LOI'
    amount: number
    deadline: string | null
  }>
  dataRoom: { totalDocuments: number; evidenceScore: number } | null
  recentActivityCount: number
  contactsSummary: { total: number; buyer: number; seller: number } | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: 'prospect', label: 'Prospects', sub: 'Total identified' },
  { key: 'contacted', label: 'Contacted', sub: 'Reached out' },
  { key: 'nda', label: 'NDA Signed', sub: 'Reviewing CIM' },
  { key: 'loi', label: 'LOI', sub: 'Offer received' },
  { key: 'due_diligence', label: 'Due Diligence', sub: 'Investigating' },
  { key: 'closed', label: 'Closed', sub: 'Deal complete' },
]

const DEAL_STEPS = [
  { label: 'Initial Contact', state: 'done' as const },
  { label: 'NDA Signed', state: 'done' as const },
  { label: 'CIM Shared', state: 'done' as const },
  { label: 'Management Meet', state: 'done' as const },
  { label: 'LOI Review', state: 'current' as const, href: '/dashboard/deal-room/loi-review' },
  { label: 'Due Diligence', state: 'pending' as const, href: '/dashboard/deal-room/due-diligence' },
  { label: 'Close', state: 'pending' as const, href: '/dashboard/deal-room/closing' },
]

const STATIC_MEETINGS = [
  {
    month: 'Feb',
    day: '19',
    title: 'LOI Review Call with Attorney',
    detail: 'Wed, 10:00 AM · Video Call',
    with: 'You, Robert Hayes, Lisa Shah',
    status: 'upcoming' as const,
  },
  {
    month: 'Feb',
    day: '24',
    title: 'LOI Negotiation Call with Buyer',
    detail: 'Mon, 2:00 PM · Video Call',
    with: 'You, Robert Hayes, James Chen, Karen Wu',
    status: 'upcoming' as const,
  },
  {
    month: 'Feb',
    day: '3',
    title: 'Management Presentation',
    detail: 'Mon, 9:00 AM · In Person — Your Office',
    with: 'You, Jenny Kim, Lisa Shah, James Chen (+2)',
    status: 'completed' as const,
  },
]

// Avatar color palette for other buyers
const AVATAR_COLORS = [
  'linear-gradient(135deg, var(--accent), #4DA3FF)',
  'linear-gradient(135deg, var(--purple), #C77DFF)',
  '#3A3A3C',
  'linear-gradient(135deg, var(--green), #6FE090)',
  'linear-gradient(135deg, var(--orange), #FFB74D)',
]

// Stage progress percentages for other-deal bar fill
const STAGE_PROGRESS: Record<string, number> = {
  prospect: 14,
  contacted: 28,
  nda: 42,
  loi: 71,
  due_diligence: 85,
  closed: 100,
}

const STAGE_COLORS: Record<string, string> = {
  prospect: 'var(--text-tertiary)',
  contacted: 'var(--accent)',
  nda: 'var(--orange)',
  loi: 'var(--purple)',
  due_diligence: 'var(--green)',
  closed: 'var(--green)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  return `${Math.floor(days / 7)} weeks ago`
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} style={{ width: 14, height: 14 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function FileDocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function StageTimeline({ startedAt }: { startedAt?: string }) {
  const startDate = startedAt ? new Date(startedAt) : null

  // Derive approximate dates for each step based on deal start
  const stepDates = startDate
    ? [
        startDate,
        new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        new Date(startDate.getTime() + 26 * 24 * 60 * 60 * 1000),
        new Date(startDate.getTime() + 38 * 24 * 60 * 60 * 1000),
        null,
        null,
      ]
    : DEAL_STEPS.map(() => null)

  const formatStepDate = (d: Date | null) =>
    d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'

  return (
    <div className={styles.stageTimeline}>
      {DEAL_STEPS.map((step, idx) => {
        const isDone = step.state === 'done'
        const isCurrent = step.state === 'current'
        const leftLineDone = idx > 0 && (DEAL_STEPS[idx - 1].state === 'done' || isDone)
        const leftLineActive = isCurrent
        const rightLineDone = isDone

        const dotEl = (
          <div
            className={`${styles.stageStep} ${isDone ? styles.stageStepDone : ''} ${isCurrent ? styles.stageStepCurrent : ''}`}
            key={idx}
          >
            <div className={styles.stageStepDotRow}>
              <div
                className={`${styles.stageStepLine} ${leftLineDone && !leftLineActive ? styles.stageStepLineDone : ''} ${leftLineActive ? styles.stageStepLineActive : ''}`}
                style={idx === 0 ? { visibility: 'hidden' } : {}}
              />
              <div className={styles.stageStepDot}>
                {isDone ? <CheckIcon /> : idx + 1}
              </div>
              <div
                className={`${styles.stageStepLine} ${rightLineDone ? styles.stageStepLineDone : ''}`}
                style={idx === DEAL_STEPS.length - 1 ? { visibility: 'hidden' } : {}}
              />
            </div>
            <div className={styles.stageStepLabel}>{step.label}</div>
            <div className={styles.stageStepDate}>{formatStepDate(stepDates[idx])}</div>
          </div>
        )

        if (step.href && isCurrent) {
          return (
            <Link href={step.href} key={idx} style={{ flex: 1, textDecoration: 'none', color: 'inherit', display: 'contents' }}>
              {dotEl}
            </Link>
          )
        }
        return dotEl
      })}
    </div>
  )
}

function ActivityFeed({ buyer, loiOffer, dealStartedAt }: {
  buyer: PipelineBuyer
  loiOffer: DealRoomData['offers'][0] | null
  dealStartedAt?: string
}) {
  const activities = [
    loiOffer && {
      type: 'doc' as const,
      text: (
        <>
          <strong>LOI received</strong> from {loiOffer.companyName} at <strong>{formatCurrency(loiOffer.amount)}</strong> enterprise value.
          {loiOffer.deadline && ` Deadline: ${formatDate(loiOffer.deadline)}.`}
        </>
      ),
      time: buyer.stageUpdatedAt ? formatDate(buyer.stageUpdatedAt) : 'Recently',
    },
    buyer.lastActivity && {
      type: 'meeting' as const,
      text: (
        <>
          <strong>Recent engagement</strong> with {buyer.primaryContact?.name ?? buyer.companyName}. Engagement level: {buyer.engagementLevel.toLowerCase()}.
        </>
      ),
      time: formatDate(buyer.lastActivity),
    },
    dealStartedAt && {
      type: 'milestone' as const,
      text: (
        <>
          <strong>Initial contact</strong> made with {buyer.primaryContact ? `${buyer.primaryContact.name} (${buyer.companyName})` : buyer.companyName}.
          Deal process began.
        </>
      ),
      time: formatDate(dealStartedAt),
    },
  ].filter(Boolean) as Array<{ type: 'doc' | 'meeting' | 'message' | 'milestone'; text: React.ReactNode; time: string }>

  if (activities.length === 0) {
    return (
      <div className={styles.activityFeed}>
        <div className={styles.activityItem}>
          <div className={`${styles.activityDot} ${styles.activityDotDoc}`} />
          <div>
            <div className={styles.activityText}>No recent activity recorded yet.</div>
          </div>
        </div>
      </div>
    )
  }

  const dotClass: Record<string, string> = {
    doc: styles.activityDotDoc,
    meeting: styles.activityDotMeeting,
    message: styles.activityDotMessage,
    milestone: styles.activityDotMilestone,
  }

  return (
    <div className={styles.activityFeed}>
      {activities.map((act, i) => (
        <div key={i} className={styles.activityItem}>
          <div className={`${styles.activityDot} ${dotClass[act.type]}`} />
          <div>
            <div className={styles.activityText}>{act.text}</div>
            <div className={styles.activityTime}>{act.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DealDocuments({ loiOffer }: { loiOffer: DealRoomData['offers'][0] | null }) {
  return (
    <div className={styles.dealDocs}>
      {loiOffer && (
        <Link href="/dashboard/deal-room/loi-review" className={styles.dealDoc}>
          <div className={`${styles.dealDocIcon} ${styles.dealDocIconPdf}`}>
            <FileDocIcon />
          </div>
          <div className={styles.dealDocName}>Letter of Intent — {loiOffer.companyName}</div>
          <div className={styles.dealDocMeta}>PDF · LOI</div>
        </Link>
      )}
      <Link href="/dashboard/data-room" className={styles.dealDoc}>
        <div className={`${styles.dealDocIcon} ${styles.dealDocIconPdf}`}>
          <FileDocIcon />
        </div>
        <div className={styles.dealDocName}>Non-Disclosure Agreement (executed)</div>
        <div className={styles.dealDocMeta}>PDF · Executed</div>
      </Link>
      <Link href="/dashboard/data-room" className={styles.dealDoc}>
        <div className={`${styles.dealDocIcon} ${styles.dealDocIconDoc}`}>
          <FileDocIcon />
        </div>
        <div className={styles.dealDocName}>Confidential Information Memorandum</div>
        <div className={styles.dealDocMeta}>DOCX · Shared</div>
      </Link>
      <Link href="/dashboard/deal-room/due-diligence" className={styles.dealDoc}>
        <div className={`${styles.dealDocIcon} ${styles.dealDocIconDoc}`}>
          <FileDocIcon />
        </div>
        <div className={styles.dealDocName}>Due Diligence Tracker</div>
        <div className={styles.dealDocMeta}>Active · Track requests</div>
      </Link>
    </div>
  )
}

function ParticipantsList({ buyer, loiOffer }: { buyer: PipelineBuyer; loiOffer: DealRoomData['offers'][0] | null }) {
  const buyerContact = buyer.primaryContact

  return (
    <div className={styles.participants}>
      {/* Seller (user) */}
      <div className={styles.participant}>
        <div className={styles.participantAvatar} style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}>
          You
        </div>
        <div className={styles.participantInfo}>
          <div className={styles.participantName}>You</div>
          <div className={styles.participantRole}>Seller</div>
        </div>
      </div>

      {/* Primary buyer contact */}
      {buyerContact && (
        <div className={styles.participant}>
          <div className={styles.participantAvatar} style={{ background: '#3A3A3C' }}>
            {getInitials(buyerContact.name)}
          </div>
          <div className={styles.participantInfo}>
            <div className={styles.participantName}>{buyerContact.name}</div>
            <div className={styles.participantRole}>Buyer — {buyerContact.title}, {buyer.companyName}</div>
          </div>
        </div>
      )}

      {/* Placeholder advisor entries */}
      <div className={styles.participant}>
        <div className={styles.participantAvatar} style={{ background: 'var(--teal)' }}>
          AT
        </div>
        <div className={styles.participantInfo}>
          <div className={styles.participantName}>Your Attorney</div>
          <div className={styles.participantRole}>Legal Counsel</div>
        </div>
      </div>
      <div className={styles.participant}>
        <div className={styles.participantAvatar} style={{ background: 'var(--orange)' }}>
          CPA
        </div>
        <div className={styles.participantInfo}>
          <div className={styles.participantName}>Your CPA</div>
          <div className={styles.participantRole}>Financial Advisor</div>
        </div>
      </div>

      {loiOffer && (
        <div className={styles.participant}>
          <div className={styles.participantAvatar} style={{ background: 'var(--purple)' }}>
            BC
          </div>
          <div className={styles.participantInfo}>
            <div className={styles.participantName}>Buyer&apos;s Counsel</div>
            <div className={styles.participantRole}>Legal Counsel — {buyer.companyName}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function OtherBuyerCard({ buyer, index }: { buyer: PipelineBuyer; index: number }) {
  const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const pct = STAGE_PROGRESS[buyer.currentStage] ?? 28
  const stageColor = STAGE_COLORS[buyer.currentStage] ?? 'var(--accent)'
  const lastSeen = buyer.lastActivity ? daysAgo(buyer.lastActivity) : 'unknown'

  return (
    <Link href="/dashboard/buyers" className={styles.otherDealCard} style={{ display: 'block' }}>
      <div className={styles.otherDealHeader}>
        <div className={styles.otherDealAvatar} style={{ background: avatarBg }}>
          {getInitials(buyer.companyName)}
        </div>
        <div>
          <div className={styles.otherDealName}>{buyer.companyName}</div>
          <div className={styles.otherDealType}>{buyer.buyerType}</div>
        </div>
      </div>
      <div className={styles.otherDealStage}>
        <div className={styles.otherDealBar}>
          <div className={styles.otherDealBarFill} style={{ width: `${pct}%`, background: stageColor }} />
        </div>
        <span className={styles.otherDealStageText} style={{ color: stageColor }}>
          {buyer.stageLabel}
        </span>
      </div>
      <div className={styles.otherDealMeta}>
        {buyer.engagementLevel !== 'COLD' ? 'Active conversation' : 'Awaiting response'} · Last active {lastSeen}
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DealRoomPage() {
  const { selectedCompanyId } = useCompany()
  const [data, setData] = useState<DealRoomData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/companies/${selectedCompanyId}/deal-room`)
      if (!res.ok) throw new Error('Failed to fetch deal room data')
      const json = await res.json()
      if (!cancelled) setData(json)
    } catch (err) {
      if (!cancelled) setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      if (!cancelled) setIsLoading(false)
    }
    return () => { cancelled = true }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading deal room...</div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <>
        <TrackPageView page="/dashboard/deal-room" />
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div className={styles.emptyStateTitle}>Could not load Deal Room</div>
          <div className={styles.emptyStateText}>{error ?? 'Something went wrong. Please try again.'}</div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={fetchData}>Try Again</button>
        </div>
      </>
    )
  }

  // ── Not activated gate ────────────────────────────────────────────────────

  if (!data.activation.isActivated) {
    const handleActivate = async () => {
      if (!selectedCompanyId || isActivating) return
      setIsActivating(true)
      try {
        const res = await fetch(`/api/companies/${selectedCompanyId}/deal-room`, { method: 'POST' })
        if (res.ok) {
          await fetchData()
        }
      } catch {
        // ignore
      } finally {
        setIsActivating(false)
      }
    }

    return (
      <>
        <TrackPageView page="/dashboard/deal-room" />
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div className={styles.emptyStateTitle}>Deal Room Not Yet Active</div>
          <div className={styles.emptyStateText}>
            {data.activation.canActivate
              ? 'Your evidence score is sufficient to activate the Deal Room. Start tracking buyer conversations, LOIs, and deal milestones.'
              : 'Your deal room will activate once your readiness score is high enough. Continue completing action items to unlock deal tracking, buyer management, and the virtual data room.'}
          </div>
          {data.activation.canActivate ? (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleActivate}
              disabled={isActivating}
            >
              {isActivating ? 'Activating...' : 'Activate Deal Room'}
            </button>
          ) : (
            <Link href="/dashboard/actions" className={`${styles.btn} ${styles.btnPrimary}`}>
              View Action Center
            </Link>
          )}
        </div>
      </>
    )
  }

  // ── Build derived data ─────────────────────────────────────────────────────

  const stageCounts: Record<string, number> = {}
  const allBuyers: PipelineBuyer[] = []
  if (data.pipeline?.stages) {
    for (const stage of data.pipeline.stages) {
      stageCounts[stage.visualStage] = stage.buyerCount
      allBuyers.push(...stage.buyers)
    }
  }

  const loiOffer = data.offers.find((o) => o.offerType === 'LOI') ?? null

  // Lead buyer: first buyer with an LOI, or highest-stage buyer
  const loiBuyer = loiOffer
    ? allBuyers.find((b) => b.companyName === loiOffer.companyName) ?? allBuyers[0] ?? null
    : allBuyers[0] ?? null

  // Other buyers: all except the lead buyer
  const otherBuyers = loiBuyer
    ? allBuyers.filter((b) => b.id !== loiBuyer.id)
    : allBuyers.slice(1)

  // Active pipeline stage key (for highlighting)
  const activePipelineStage = loiOffer ? 'loi' : otherBuyers.some((b) => b.currentStage === 'nda') ? 'nda' : 'contacted'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <TrackPageView page="/dashboard/deal-room" />

      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1>Deal Room</h1>
          <p>
            {loiOffer
              ? `Manage your active deal process with ${loiOffer.companyName}`
              : `Track your ${data.pipeline?.activeBuyers ?? 0} active buyer conversations`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/deal-room/due-diligence" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            Due Diligence
          </Link>
          <Link href="/dashboard/data-room" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Participant
          </Link>
        </div>
      </div>

      {/* Pipeline Overview */}
      <div className={styles.pipeline}>
        {PIPELINE_STAGES.map((stage, i) => {
          const count = stageCounts[stage.key] ?? 0
          const isActive = stage.key === activePipelineStage
          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                className={`${styles.pipelineStage} ${isActive ? styles.pipelineStageActive : ''}`}
                style={{ flex: 1 }}
              >
                <div
                  className={styles.pipelineStageLabel}
                  style={isActive ? { color: 'var(--accent)' } : {}}
                >
                  {stage.label}
                </div>
                <div
                  className={styles.pipelineStageCount}
                  style={isActive ? { color: 'var(--accent)' } : {}}
                >
                  {count}
                </div>
                <div className={styles.pipelineStageSub}>{stage.sub}</div>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className={styles.pipelineConnector}>&rarr;</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Active Deal Hero — lead buyer card */}
      {loiBuyer && (
        <div className={styles.dealHero}>
          <div className={styles.dealHeroHeader}>
            <div className={styles.dealHeroAvatar}>
              {getInitials(loiBuyer.companyName)}
            </div>
            <div className={styles.dealHeroInfo}>
              <div className={styles.dealHeroName}>{loiBuyer.companyName}</div>
              <div className={styles.dealHeroMeta}>
                <span>{loiBuyer.buyerType}</span>
                {data.deal?.startedAt && (
                  <span>Deal started {formatDate(data.deal.startedAt)}</span>
                )}
                {data.deal?.startedAt && (
                  <span>
                    {Math.floor((Date.now() - new Date(data.deal.startedAt).getTime()) / (1000 * 60 * 60 * 24))} days in process
                  </span>
                )}
              </div>
            </div>
            <div className={styles.dealHeroStage}>{loiBuyer.stageLabel}</div>
            {loiOffer && (
              <div className={styles.dealHeroActions}>
                <Link href="/dashboard/deal-room/loi-review" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
                  Review LOI
                </Link>
              </div>
            )}
          </div>

          <div className={styles.dealHeroBody}>
            {/* Stage Timeline */}
            <StageTimeline startedAt={data.deal?.startedAt} />

            <div className={styles.dealDetails}>
              {/* Left: Activity Feed + Documents */}
              <div>
                <div className={styles.cardLabel}>Recent Activity</div>
                <ActivityFeed
                  buyer={loiBuyer}
                  loiOffer={loiOffer}
                  dealStartedAt={data.deal?.startedAt}
                />

                <div className={styles.cardLabel} style={{ marginTop: 20 }}>Deal Documents</div>
                <DealDocuments loiOffer={loiOffer} />
              </div>

              {/* Right: LOI Summary + Participants */}
              <div>
                {loiOffer ? (
                  <>
                    <div className={styles.cardLabel}>LOI Summary</div>
                    <Link href="/dashboard/deal-room/loi-review" className={styles.loiSummaryCard}>
                      <div className={styles.loiAmount}>{formatCurrency(loiOffer.amount)}</div>
                      <div className={styles.loiAmountSub}>
                        Enterprise Value &middot; {loiOffer.offerType}
                      </div>
                      <div className={styles.loiDetails}>
                        <strong>Deadline:</strong>{' '}
                        {loiOffer.deadline ? formatDate(loiOffer.deadline) : 'No deadline set'}
                        <br />
                        Click to review full LOI terms, analysis, and counter-offer strategy.
                      </div>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className={styles.cardLabel}>Pipeline Status</div>
                    <div style={{
                      background: 'var(--surface-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      marginBottom: 20,
                      border: '1px solid var(--border-light)',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                    }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>
                        {data.pipeline?.activeBuyers ?? 0} active buyer{(data.pipeline?.activeBuyers ?? 0) !== 1 ? 's' : ''} in pipeline
                      </strong>
                      Continue progressing conversations to receive your first LOI.
                      Share documents securely through the Data Room.
                    </div>
                  </>
                )}

                <div className={styles.cardLabel}>Deal Participants</div>
                <ParticipantsList buyer={loiBuyer} loiOffer={loiOffer} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No lead buyer — simple pipeline card */}
      {!loiBuyer && data.pipeline && (
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>Buyer Pipeline</div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {data.pipeline.activeBuyers} active buyer{data.pipeline.activeBuyers !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            You have {data.pipeline.totalBuyers} buyer{data.pipeline.totalBuyers !== 1 ? 's' : ''} in your pipeline.
            Continue progressing conversations to receive your first LOI.
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <Link href="/dashboard/data-room" className={`${styles.btn} ${styles.btnPrimary}`}>
              Open Data Room
            </Link>
          </div>
        </div>
      )}

      {/* Meetings */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Meetings</h2>
        <Link href="/dashboard/deal-room/due-diligence" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Log Meeting
        </Link>
      </div>
      <div className={styles.meetingsCard}>
        {STATIC_MEETINGS.map((meeting, i) => (
          <div key={i} className={styles.meetingItem}>
            <div className={styles.meetingDateBox}>
              <div className={styles.meetingMonth}>{meeting.month}</div>
              <div className={styles.meetingDay}>{meeting.day}</div>
            </div>
            <div className={styles.meetingInfo}>
              <div className={styles.meetingTitle}>{meeting.title}</div>
              <div className={styles.meetingDetail}>{meeting.detail}</div>
              <div className={styles.meetingWith}>{meeting.with}</div>
            </div>
            <span className={`${styles.meetingStatus} ${meeting.status === 'upcoming' ? styles.meetingStatusUpcoming : styles.meetingStatusCompleted}`}>
              {meeting.status === 'upcoming' ? 'Upcoming' : 'Completed'}
            </span>
          </div>
        ))}
      </div>

      {/* Other Active Buyers */}
      {otherBuyers.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Other Active Buyers</h2>
            <Link href="/dashboard/buyers" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
              View All Buyers
            </Link>
          </div>
          <div className={styles.otherDeals}>
            {otherBuyers.slice(0, 6).map((buyer, i) => (
              <OtherBuyerCard key={buyer.id} buyer={buyer} index={i} />
            ))}
          </div>
        </>
      )}

      {/* Deal Process navigation cards — always shown */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Deal Process</h2>
      </div>
      <div className={styles.otherDeals}>
        <Link href="/dashboard/deal-room/loi-review" className={styles.otherDealCard} style={{ display: 'block' }}>
          <div className={styles.otherDealHeader}>
            <div className={styles.otherDealAvatar} style={{ background: 'var(--purple)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <div className={styles.otherDealName}>LOI Review</div>
              <div className={styles.otherDealType}>Letter of Intent</div>
            </div>
          </div>
          <div className={styles.otherDealStage}>
            <div className={styles.otherDealBar}>
              <div className={styles.otherDealBarFill} style={{ width: loiOffer ? '85%' : '0%', background: 'var(--purple)' }} />
            </div>
            <span className={styles.otherDealStageText} style={{ color: 'var(--purple)' }}>
              {loiOffer ? 'Active' : 'Pending'}
            </span>
          </div>
          <div className={styles.otherDealMeta}>
            {loiOffer ? `${formatCurrency(loiOffer.amount)} offer received` : 'No LOI received yet'}
          </div>
        </Link>

        <Link href="/dashboard/deal-room/due-diligence" className={styles.otherDealCard} style={{ display: 'block' }}>
          <div className={styles.otherDealHeader}>
            <div className={styles.otherDealAvatar} style={{ background: 'var(--orange)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className={styles.otherDealName}>Due Diligence</div>
              <div className={styles.otherDealType}>Document Requests</div>
            </div>
          </div>
          <div className={styles.otherDealStage}>
            <div className={styles.otherDealBar}>
              <div className={styles.otherDealBarFill} style={{ width: '40%', background: 'var(--orange)' }} />
            </div>
            <span className={styles.otherDealStageText} style={{ color: 'var(--orange)' }}>In Progress</span>
          </div>
          <div className={styles.otherDealMeta}>Track buyer document requests</div>
        </Link>

        <Link href="/dashboard/deal-room/closing" className={styles.otherDealCard} style={{ display: 'block' }}>
          <div className={styles.otherDealHeader}>
            <div className={styles.otherDealAvatar} style={{ background: 'var(--green)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <div>
              <div className={styles.otherDealName}>Closing</div>
              <div className={styles.otherDealType}>Closing Checklist</div>
            </div>
          </div>
          <div className={styles.otherDealStage}>
            <div className={styles.otherDealBar}>
              <div className={styles.otherDealBarFill} style={{ width: '20%', background: 'var(--accent)' }} />
            </div>
            <span className={styles.otherDealStageText} style={{ color: 'var(--accent)' }}>Early Stage</span>
          </div>
          <div className={styles.otherDealMeta}>
            {data.deal?.targetCloseDate
              ? `Target: ${formatDate(data.deal.targetCloseDate)}`
              : 'No target close date set'}
          </div>
        </Link>
      </div>
    </>
  )
}
