'use client'

import Link from 'next/link'
import styles from '@/components/advisor/advisor.module.css'

// TODO: wire to API — replace all static data with real API calls

/* ─────────────────────────────────────────────
   Static placeholder data
───────────────────────────────────────────── */

const CLIENTS = [
  {
    id: 'reynolds-hvac',
    name: 'Reynolds HVAC Services',
    owner: 'Mike Reynolds',
    initials: 'RH',
    avatarColor: 'Blue' as const,
    bri: 71,
    briOffset: 36.5,
    briColor: 'var(--orange)',
    valuation: '$8.2M',
    retirement: '72%',
    status: 'attention' as const,
    statusText: '2 items need attention',
    phase: 'Phase III — Improving Value',
    lastActive: 'Last active: 2 days ago',
  },
  {
    id: 'coastal-plumbing',
    name: 'Coastal Plumbing Co',
    owner: 'David Park',
    initials: 'CP',
    avatarColor: 'Green' as const,
    bri: 84,
    briOffset: 20.1,
    briColor: 'var(--green)',
    valuation: '$12.1M',
    retirement: '96%',
    status: 'ok' as const,
    statusText: 'On track',
    phase: 'Phase IV — Ready to Sell',
    lastActive: 'Last active: 1 day ago',
  },
  {
    id: 'summit-electric',
    name: 'Summit Electric',
    owner: 'Lisa Wong',
    initials: 'SE',
    avatarColor: 'Orange' as const,
    bri: 45,
    briOffset: 69.1,
    briColor: 'var(--red)',
    valuation: '$3.8M',
    retirement: '48%',
    status: 'stalled' as const,
    statusText: 'Stalled — no activity 3 weeks',
    phase: 'Phase II — Assessment',
    lastActive: 'Last active: 22 days ago',
  },
] as const

const ACTION_ITEMS = [
  {
    id: 'action-1',
    type: 'urgent' as const,
    title: 'Review Coastal Plumbing LOI — ServiceMaster PE offer received',
    desc: 'LOI for $12.8M received yesterday. Client needs your review of tax implications before responding.',
    client: 'Coastal Plumbing Co · David Park',
    priority: 'Urgent',
  },
  {
    id: 'action-2',
    type: 'review' as const,
    title: 'Review Reynolds HVAC tax planning — QSBS eligibility question',
    desc: 'AI flagged potential QSBS qualification issue. S-Corp to C-Corp conversion may restart 5-year holding period.',
    client: 'Reynolds HVAC Services · Mike Reynolds',
    priority: 'Review',
  },
  {
    id: 'action-3',
    type: 'review' as const,
    title: 'Reynolds HVAC Q3/Q4 financials are 6 months stale',
    desc: 'Valuation and retirement calculations are based on outdated data. Remind client to upload current statements.',
    client: 'Reynolds HVAC Services · Mike Reynolds',
    priority: 'Review',
  },
  {
    id: 'action-4',
    type: 'outreach' as const,
    title: "Summit Electric — client hasn't logged in for 3 weeks",
    desc: "Lisa Wong hasn't completed her initial assessments. Consider a check-in call to re-engage.",
    client: 'Summit Electric · Lisa Wong',
    priority: 'Outreach',
  },
] as const

const NOTES = [
  {
    id: 'note-1',
    dotColor: 'Purple' as const,
    text: (
      <>
        <strong>Coastal Plumbing:</strong> David is leaning toward the ServiceMaster offer but wants
        to understand the earnout structure better. Scheduled follow-up for Friday to walk through
        net proceeds under different earnout scenarios.
      </>
    ),
    meta: 'Feb 17, 2026 · You',
  },
  {
    id: 'note-2',
    dotColor: 'Blue' as const,
    text: (
      <>
        <strong>Reynolds HVAC:</strong> Mike asked about converting from S-Corp to C-Corp for QSBS
        benefits. Confirmed this would restart the 5-year clock — not worth it at his timeline.
        Recommended focusing on installment sale structure instead.
      </>
    ),
    meta: 'Feb 14, 2026 · You',
  },
  {
    id: 'note-3',
    dotColor: 'Orange' as const,
    text: (
      <>
        <strong>Summit Electric:</strong> Left voicemail for Lisa. She mentioned at onboarding that
        Q1 is her busiest season — may explain the drop-off. Will try again next week.
      </>
    ),
    meta: 'Feb 10, 2026 · You',
  },
] as const

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */

function StatusIcon({ type }: { type: 'attention' | 'ok' | 'stalled' }) {
  if (type === 'attention') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )
  }
  if (type === 'ok') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }
  // stalled
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ActionIcon({ type }: { type: 'urgent' | 'review' | 'outreach' }) {
  if (type === 'urgent') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  }
  if (type === 'review') {
    // Dollar-sign icon for the first review, document for the second —
    // mocksite uses dollar for QSBS, document for stale financials.
    // We use a generic "file" SVG for all review items to match mocksite pattern.
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    )
  }
  // outreach
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

// The third action item (stale financials) uses a document icon in the mocksite
function ActionIconDocument() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function AdvisorDashboardPage() {
  return (
    <div>
      {/* Top Bar */}
      <div className={styles.adTopBar}>
        <div className={styles.adGreeting}>
          <h1>Good morning, Sarah</h1>
          <p>3 active clients · 4 items need your attention</p>
        </div>
        <div className={styles.adTopBarActions}>
          <button className={`${styles.adBtn} ${styles.adBtnSecondary}`} type="button">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export All Reports
          </button>
          <button className={`${styles.adBtn} ${styles.adBtnPrimary}`} type="button">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Invite Client
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {/* TODO: wire to API — /api/advisor/stats */}
      <div className={styles.adStatsRow}>
        <div className={styles.adStatCard}>
          <div className={styles.adStatLabel}>Active Clients</div>
          <div className={styles.adStatValue}>3</div>
          <div className={styles.adStatSub}>1 added this month</div>
        </div>
        <div className={styles.adStatCard}>
          <div className={styles.adStatLabel}>Avg. BRI Score</div>
          <div className={`${styles.adStatValue} ${styles.adStatValueOrange}`}>67</div>
          <div className={styles.adStatSub}>+3 avg. this month</div>
        </div>
        <div className={styles.adStatCard}>
          <div className={styles.adStatLabel}>Total Portfolio Value</div>
          <div className={styles.adStatValue}>$24.1M</div>
          <div className={styles.adStatSub}>Across 3 businesses</div>
        </div>
        <div className={styles.adStatCard}>
          <div className={styles.adStatLabel}>Items Needing Attention</div>
          <div className={`${styles.adStatValue} ${styles.adStatValueRed}`}>4</div>
          <div className={styles.adStatSub}>2 urgent</div>
        </div>
      </div>

      {/* Client Cards */}
      {/* TODO: wire to API — /api/advisor/clients */}
      <div className={styles.adSectionHeader}>
        <h2 className={styles.adSectionTitle}>Your Clients</h2>
      </div>
      <div className={styles.adClientGrid}>
        {CLIENTS.map((client) => (
          <Link key={client.id} href="/dashboard" className={styles.adClientCard}>
            <div className={styles.adClientHeader}>
              <div
                className={
                  client.avatarColor === 'Blue'
                    ? `${styles.adClientAvatar} ${styles.adClientAvatarBlue}`
                    : client.avatarColor === 'Green'
                      ? `${styles.adClientAvatar} ${styles.adClientAvatarGreen}`
                      : `${styles.adClientAvatar} ${styles.adClientAvatarOrange}`
                }
              >
                {client.initials}
              </div>
              <div className={styles.adClientInfo}>
                <div className={styles.adClientName}>{client.name}</div>
                <div className={styles.adClientOwner}>{client.owner}</div>
              </div>
              {/* BRI Mini Ring — r=20, circumference=125.7 */}
              <div className={styles.adBriMini}>
                <svg viewBox="0 0 48 48" aria-label={`BRI score ${client.bri}`}>
                  <circle className={styles.adBriMiniBg} cx="24" cy="24" r="20" />
                  <circle
                    className={styles.adBriMiniFill}
                    cx="24"
                    cy="24"
                    r="20"
                    style={{
                      stroke: client.briColor,
                      strokeDasharray: '125.7',
                      strokeDashoffset: client.briOffset,
                    }}
                  />
                </svg>
                <div className={styles.adBriMiniText} style={{ color: client.briColor }}>
                  {client.bri}
                </div>
              </div>
            </div>

            <div className={styles.adClientMetrics}>
              <div>
                <div className={styles.adClientMetricLabel}>Valuation</div>
                <div className={styles.adClientMetricValue}>{client.valuation}</div>
              </div>
              <div>
                <div className={styles.adClientMetricLabel}>Retirement Funded</div>
                <div className={styles.adClientMetricValue}>{client.retirement}</div>
              </div>
            </div>

            <div
              className={
                client.status === 'attention'
                  ? `${styles.adClientStatus} ${styles.adStatusAttention}`
                  : client.status === 'ok'
                    ? `${styles.adClientStatus} ${styles.adStatusOk}`
                    : `${styles.adClientStatus} ${styles.adStatusStalled}`
              }
            >
              <StatusIcon type={client.status} />
              {client.statusText}
            </div>

            <div className={styles.adClientPhase}>{client.phase}</div>
            <div className={styles.adClientLastActive}>{client.lastActive}</div>
          </Link>
        ))}
      </div>

      {/* Action Items */}
      {/* TODO: wire to API — /api/advisor/action-items */}
      <div className={styles.adSectionHeader}>
        <h2 className={styles.adSectionTitle}>Your Action Items</h2>
        <span className={styles.adSectionCount}>4 items</span>
      </div>
      <div className={styles.adActionList}>
        {ACTION_ITEMS.map((item) => (
          <div key={item.id} className={styles.adActionItem}>
            <div
              className={
                item.type === 'urgent'
                  ? `${styles.adActionIcon} ${styles.adActionIconUrgent}`
                  : item.type === 'review'
                    ? `${styles.adActionIcon} ${styles.adActionIconReview}`
                    : `${styles.adActionIcon} ${styles.adActionIconOutreach}`
              }
            >
              {/* Third item (stale financials) uses document icon, others use type-specific */}
              {item.id === 'action-3' ? (
                <ActionIconDocument />
              ) : (
                <ActionIcon type={item.type} />
              )}
            </div>
            <div className={styles.adActionContent}>
              <div className={styles.adActionTitle}>{item.title}</div>
              <div className={styles.adActionDesc}>{item.desc}</div>
              <div className={styles.adActionClient}>{item.client}</div>
            </div>
            <div className={styles.adActionMeta}>
              <span
                className={
                  item.type === 'urgent'
                    ? `${styles.adPriorityBadge} ${styles.adPriorityUrgent}`
                    : item.type === 'review'
                      ? `${styles.adPriorityBadge} ${styles.adPriorityReview}`
                      : `${styles.adPriorityBadge} ${styles.adPriorityOutreach}`
                }
              >
                {item.priority}
              </span>
              <div className={styles.adActionArrow}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Notes */}
      {/* TODO: wire to API — /api/advisor/notes */}
      <div className={styles.adNotesCard}>
        <div className={styles.adNotesHeader}>
          <div className={styles.adNotesTitle}>Recent Notes</div>
          <button className={styles.adBtnSmall} type="button">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Note
          </button>
        </div>
        {NOTES.map((note) => (
          <div key={note.id} className={styles.adNoteItem}>
            <div
              className={
                note.dotColor === 'Purple'
                  ? `${styles.adNoteDot} ${styles.adNoteDotPurple}`
                  : note.dotColor === 'Blue'
                    ? `${styles.adNoteDot} ${styles.adNoteDotBlue}`
                    : `${styles.adNoteDot} ${styles.adNoteDotOrange}`
              }
            />
            <div className={styles.adNoteBody}>
              <div className={styles.adNoteText}>{note.text}</div>
              <div className={styles.adNoteMeta}>{note.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
